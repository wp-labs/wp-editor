use serde_json::Value;
use std::collections::VecDeque;
use std::collections::hash_map::DefaultHasher;
use std::fs;
use std::hash::{Hash, Hasher};
use std::io::Result;
use std::path::Path;
use std::process::Command;
use std::time::SystemTime;

fn get_cargo_metadata() -> Value {
    let output = Command::new("cargo")
        .args(["metadata", "--format-version", "1"])
        .output()
        .expect("Failed to run cargo metadata");
    serde_json::from_slice(&output.stdout).expect("Failed to parse cargo metadata JSON")
}

fn get_package_version<'a>(packages: &'a [Value], name: &str) -> &'a str {
    packages
        .iter()
        .find(|pkg| pkg.get("name").and_then(|v| v.as_str()) == Some(name))
        .and_then(|pkg| pkg.get("version").and_then(|v| v.as_str()))
        .unwrap_or("unknown")
}

fn run_npm_build() {
    let result1 = Command::new("npm")
        .arg("install")
        .current_dir("web")
        .status();
    let result2 = Command::new("npm")
        .arg("run")
        .arg("build")
        .current_dir("web")
        .status();
    if result1.is_err() || result2.is_err() {
        println!("cargo:warning=本地未安装npm,使用本地前端静态资源");
        let dist_path = "web/dist";
        if !Path::new(dist_path).exists() {
            fs::create_dir_all(dist_path).unwrap();
        }
    }
}

/// 递归复制目录，打印每个文件的复制日志
fn copy_dir_all(src: &Path, dst: &Path) -> Result<()> {
    if !dst.exists() {
        fs::create_dir_all(dst)?;
    }
    for entry in fs::read_dir(src)? {
        let entry = entry?;
        let ty = entry.file_type()?;
        let src_path = entry.path();
        let dst_path = dst.join(entry.file_name());
        if ty.is_dir() {
            copy_dir_all(&src_path, &dst_path)?;
        } else {
            fs::copy(&src_path, &dst_path)?;
        }
    }
    Ok(())
}

fn dir_hash<P: AsRef<Path>>(dir: P) -> u64 {
    let mut hasher = DefaultHasher::new();
    let mut queue = VecDeque::new();
    let base = dir.as_ref().to_path_buf();
    queue.push_back(base.clone());

    let mut entries = Vec::new();

    while let Some(path) = queue.pop_front() {
        if let Ok(read_dir) = fs::read_dir(&path) {
            for entry in read_dir.flatten() {
                let entry_path = entry.path();
                if entry_path.is_dir() {
                    queue.push_back(entry_path);
                } else if let Ok(meta) = entry.metadata() {
                    let rel = entry_path.strip_prefix(&base).unwrap().to_string_lossy();
                    let mtime = meta
                        .modified()
                        .unwrap_or(SystemTime::UNIX_EPOCH)
                        .duration_since(SystemTime::UNIX_EPOCH)
                        .unwrap_or_default()
                        .as_secs();
                    entries.push(format!("{}:{}:{}", rel, meta.len(), mtime));
                }
            }
        }
    }
    entries.sort();
    for e in entries {
        e.hash(&mut hasher);
    }
    hasher.finish()
}

/// 判断两个目录内容是否一致
fn compare_dirs(src: &Path, dst: &Path) -> bool {
    dir_hash(src) == dir_hash(dst)
}

/// 复制 warp_parse_doc 的 docs 目录到 web/public/doc
fn copy_docs_assets(metadata: &Value) {
    let docs_pkg = metadata["packages"]
        .as_array()
        .unwrap()
        .iter()
        .find(|pkg| pkg["name"] == "wp_docs");

    if let Some(docs_pkg) = docs_pkg {
        let docs_path = docs_pkg["manifest_path"]
            .as_str()
            .unwrap()
            .replace("/Cargo.toml", "");

        let src = Path::new(&docs_path).join("docs/");
        let dst = Path::new("web/public/doc");
        if src.exists() {
            if dst.exists() && compare_dirs(&src, dst) {
                println!("cargo:warning=文件未变动,无需复制: {:?} -> {:?}", src, dst);
            } else {
                println!("cargo:warning=拷贝文件: {:?} -> {:?}", src, dst);
                copy_dir_all(&src, dst).expect("Failed to copy docs assets");
            }
        }
    }
}

fn main() {
    // 判断是否为 release 构建
    let is_release = std::env::var("PROFILE").unwrap_or_default() == "release";

    // 只获取一次 metadata
    let metadata = get_cargo_metadata();

    if !is_release {
        // 拉取帮助文档资源
        copy_docs_assets(&metadata);
        // 构建静态文件
        run_npm_build();
    } else {
        println!("cargo:warning=Release 构建，跳过 npm 和文档 copy");
    }

    // 补充版本号
    let app_name = env!("CARGO_PKG_NAME");
    let warp_engine_pkg_name = "wp-oml";

    let packages = metadata
        .get("packages")
        .and_then(|v| v.as_array())
        .expect("No packages found in cargo metadata");

    let wp_editer = get_package_version(packages, app_name);
    let warp_engine = get_package_version(packages, warp_engine_pkg_name);

    println!("cargo:rustc-env=wp_editer_VERSION={}", wp_editer);
    println!("cargo:rustc-env=WARP_ENGINE_VERSION={}", warp_engine);
}
