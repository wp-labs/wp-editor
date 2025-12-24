use clap::Parser;
use wp_editer::server::start;

#[derive(Parser, Debug)]
#[command(version, about, long_about = None)]
struct Args {
    // 可以在这里添加其他命令行参数
}

#[tokio::main]
async fn main() {
    Args::parse();
    start().await.expect("启动服务器失败");
}
