use serde_json::Value;
use std::collections::VecDeque;
use std::collections::hash_map::DefaultHasher;
use std::fs;
use std::hash::{Hash, Hasher};
use std::io::Result as IoResult;
use std::path::{Path, PathBuf};
use std::process::Command;
use std::time::SystemTime;

#[derive(Debug, serde::Deserialize)]
struct EditorAssetManifest {
    language_id: String,
    parser_wasm: String,
    highlights_query: String,
    completion_bundle: Option<String>,
}

struct TreeSitterAssetSource {
    package_name: &'static str,
    manifest_relative: &'static str,
    local_override_root: Option<&'static str>,
}

const TREE_SITTER_ASSET_SOURCES: &[TreeSitterAssetSource] = &[
    TreeSitterAssetSource {
        package_name: "tree-sitter-wpl",
        manifest_relative: "editor/asset-manifest.json",
        local_override_root: Some("../ddwp-tree-sitter/tree-sitter-wpl"),
    },
    TreeSitterAssetSource {
        package_name: "tree-sitter-oml",
        manifest_relative: "editor/asset-manifest.json",
        local_override_root: Some("../wp-tree-sitter/tree-sitter-oml"),
    },
];

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

fn get_package_root(packages: &[Value], name: &str) -> Option<PathBuf> {
    packages
        .iter()
        .find(|pkg| pkg.get("name").and_then(|v| v.as_str()) == Some(name))
        .and_then(|pkg| pkg.get("manifest_path").and_then(|v| v.as_str()))
        .and_then(|path| Path::new(path).parent().map(Path::to_path_buf))
}

fn read_editor_asset_manifest(
    crate_root: &Path,
    source: &TreeSitterAssetSource,
) -> Result<EditorAssetManifest, String> {
    let manifest_path = crate_root.join(source.manifest_relative);
    let content = fs::read_to_string(&manifest_path).map_err(|err| {
        format!(
            "读取语言清单失败: path={}, error={}",
            manifest_path.display(),
            err
        )
    })?;
    serde_json::from_str(&content).map_err(|err| {
        format!(
            "解析语言清单失败: path={}, error={}",
            manifest_path.display(),
            err
        )
    })
}

fn copy_asset(src_root: &Path, relative_path: &str, dest_root: &Path) {
    let src = src_root.join(relative_path);
    if !src.exists() {
        println!("cargo:warning=语言资产不存在，跳过复制: {}", src.display());
        return;
    }
    println!("cargo:rerun-if-changed={}", src.display());
    // wp-editor 的前端 manifest 使用 editor 目录下的扁平资源路径，
    // 因此无论依赖仓库中的源文件位于 editor/、queries/ 还是 completions/，
    // 都统一按文件名导出到当前语言的 editor 目录。
    let file_name = Path::new(relative_path)
        .file_name()
        .expect("语言资产路径缺少文件名");
    let dest = dest_root.join(file_name);
    if let Some(parent) = dest.parent() {
        fs::create_dir_all(parent).expect("创建语言资产目录失败");
    }
    fs::copy(&src, &dest).unwrap_or_else(|err| {
        panic!(
            "复制语言资产失败: {} -> {}: {}",
            src.display(),
            dest.display(),
            err
        )
    });
}

fn copy_asset_as(src_root: &Path, relative_path: &str, dest_root: &Path, file_name: &str) {
    let src = src_root.join(relative_path);
    if !src.exists() {
        println!("cargo:warning=语言资产不存在，跳过复制: {}", src.display());
        return;
    }
    println!("cargo:rerun-if-changed={}", src.display());
    let dest = dest_root.join(file_name);
    fs::copy(&src, &dest).unwrap_or_else(|err| {
        panic!(
            "复制语言资产失败: {} -> {}: {}",
            src.display(),
            dest.display(),
            err
        )
    });
}

fn export_tree_sitter_assets(metadata: &Value) {
    let packages = metadata["packages"]
        .as_array()
        .expect("No packages found in cargo metadata");
    let languages_root = Path::new("web/public/tree-sitter/languages");
    fs::create_dir_all(languages_root).expect("创建 tree-sitter 资源目录失败");

    for source in TREE_SITTER_ASSET_SOURCES {
        let local_root = source
            .local_override_root
            .map(PathBuf::from)
            .filter(|p| p.exists());
        let package_root = get_package_root(packages, source.package_name);
        let root = local_root.or(package_root);
        let Some(root) = root else {
            println!(
                "cargo:warning=未找到 tree-sitter 依赖目录: {}",
                source.package_name
            );
            continue;
        };
        let manifest = match read_editor_asset_manifest(&root, source) {
            Ok(manifest) => manifest,
            Err(err) => {
                println!("cargo:warning={}", err);
                continue;
            }
        };
        println!(
            "cargo:rerun-if-changed={}",
            root.join(source.manifest_relative).display()
        );
        let language_root = languages_root.join(&manifest.language_id).join("editor");
        fs::create_dir_all(&language_root).expect("创建语言资源目录失败");
        copy_asset(&root, &manifest.parser_wasm, &language_root);
        copy_asset(&root, &manifest.highlights_query, &language_root);
        if let Some(bundle) = manifest.completion_bundle.as_deref() {
            // wp-editor 既有资源约定使用 completions.json，统一保留该文件名。
            copy_asset_as(&root, bundle, &language_root, "completions.json");
        }
        // 依赖仓库可以使用 editor/wasm、queries、completions 等源目录，
        // 但 wp-editor 前端固定使用 editor 下的扁平资源路径，因此输出规范化清单。
        let manifest_path = language_root.join("asset-manifest.json");
        let normalized = serde_json::json!({
            "language_id": manifest.language_id,
            "parser_wasm": format!("editor/{}", Path::new(&manifest.parser_wasm).file_name().unwrap().to_string_lossy()),
            "highlights_query": format!("editor/{}", Path::new(&manifest.highlights_query).file_name().unwrap().to_string_lossy()),
            "completion_bundle": manifest.completion_bundle.as_ref().map(|_| "editor/completions.json"),
        });
        fs::write(
            &manifest_path,
            serde_json::to_vec_pretty(&normalized).unwrap(),
        )
        .expect("写入规范化语言资源清单失败");
    }
}

/// 将 web-tree-sitter 的运行时 wasm 导出到前端静态目录。
fn export_web_tree_sitter_runtime() {
    let source = Path::new("web/node_modules/web-tree-sitter/tree-sitter.wasm");
    if !source.exists() {
        println!(
            "cargo:warning=未找到 tree-sitter 运行时 wasm，跳过复制: {}",
            source.display()
        );
        return;
    }
    println!("cargo:rerun-if-changed={}", source.display());
    let target = Path::new("web/public/tree-sitter/tree-sitter.wasm");
    if let Some(parent) = target.parent() {
        fs::create_dir_all(parent).expect("创建 tree-sitter 运行时目录失败");
    }
    fs::copy(source, target).expect("复制 tree-sitter 运行时 wasm 失败");
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
fn _copy_dir_all(src: &Path, dst: &Path) -> IoResult<()> {
    if !dst.exists() {
        fs::create_dir_all(dst)?;
    }
    for entry in fs::read_dir(src)? {
        let entry = entry?;
        let ty = entry.file_type()?;
        let src_path = entry.path();
        let dst_path = dst.join(entry.file_name());
        if ty.is_dir() {
            _copy_dir_all(&src_path, &dst_path)?;
        } else {
            fs::copy(&src_path, &dst_path)?;
        }
    }
    Ok(())
}

fn _dir_hash<P: AsRef<Path>>(dir: P) -> u64 {
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
fn _compare_dirs(src: &Path, dst: &Path) -> bool {
    _dir_hash(src) == _dir_hash(dst)
}

/// 复制 warp_parse_doc 的 docs 目录到 web/public/doc
fn _copy_docs_assets(metadata: &Value) {
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
            if dst.exists() && _compare_dirs(&src, dst) {
                println!("cargo:warning=文件未变动,无需复制: {:?} -> {:?}", src, dst);
            } else {
                println!("cargo:warning=拷贝文件: {:?} -> {:?}", src, dst);
                _copy_dir_all(&src, dst).expect("Failed to copy docs assets");
            }
        }
    }
}

fn main() {
    // 只获取一次 metadata
    let metadata = get_cargo_metadata();

    export_tree_sitter_assets(&metadata);
    export_web_tree_sitter_runtime();
    run_npm_build();

    // 补充版本号
    let app_name = env!("CARGO_PKG_NAME");
    let warp_engine_pkg_name = "wp-oml";

    let packages = metadata
        .get("packages")
        .and_then(|v| v.as_array())
        .expect("No packages found in cargo metadata");

    let wp_editor = get_package_version(packages, app_name);
    let warp_engine = get_package_version(packages, warp_engine_pkg_name);

    println!("cargo:rustc-env=wp_editor_VERSION={}", wp_editor);
    println!("cargo:rustc-env=WARP_ENGINE_VERSION={}", warp_engine);
}
