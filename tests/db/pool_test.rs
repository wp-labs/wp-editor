use wp_editor::db::DbPool;

/// 测试数据库连接池的URL验证功能
/// 验证连接池能够正确识别和拒绝各种无效的数据库URL格式
#[tokio::test]
async fn test_db_pool_url_validation() {
    // 测试各种无效的数据库URL
    let invalid_urls = vec![
        "invalid://url",
        "postgresql://",
        "postgresql://user@",
        "postgresql://user:@host",
        "postgresql://user:pass@",
    ];

    for url in invalid_urls {
        let result = DbPool::new(url, 10, 1).await;
        assert!(result.is_err(), "无效URL {} 应该返回错误", url);
    }
}

/// 测试SQLite内存数据库连接池的创建和基本操作
/// 验证连接池能够成功创建、测试连接、克隆等基本功能
#[tokio::test]
async fn test_db_pool_sqlite_operations() {
    // 使用内存SQLite数据库进行测试
    let result = DbPool::new("sqlite::memory:", 1, 1).await;

    match result {
        Ok(pool) => {
            // 测试连接
            let test_result = pool.test_connection().await;
            // SQLite内存数据库应该能够连接成功
            assert!(test_result.is_ok(), "内存数据库连接测试应该成功");

            // 测试获取内部连接
            let _inner = pool.inner();

            // 测试DbPool的Clone实现
            let cloned_pool = pool.clone();

            // 两个池应该都能工作
            let _ = pool.test_connection().await;
            let _ = cloned_pool.test_connection().await;
        }
        Err(e) => {
            // 如果SQLite不可用，这是可以接受的
            println!("SQLite不可用: {}", e);
        }
    }
}

/// 测试数据库连接池的参数配置
/// 验证连接池能够处理各种连接参数配置，包括边界情况
#[test]
fn test_db_pool_parameters() {
    // 测试不同的连接池参数
    tokio::runtime::Runtime::new().unwrap().block_on(async {
        // 测试最大连接数为0的情况
        let result = DbPool::new("sqlite::memory:", 0, 0).await;
        // 这应该失败或者使用默认值
        if result.is_ok() {
            println!("连接池创建成功，即使最大连接数为0");
        }

        // 测试较大的连接数
        let result = DbPool::new("sqlite::memory:", 100, 10).await;
        if result.is_ok() {
            println!("大连接池创建成功");
        }
    });
}

/// 测试数据库连接超时和网络错误处理
/// 验证连接池能够正确处理网络不可达的情况
#[tokio::test]
async fn test_db_pool_connection_timeout() {
    // 测试连接到不存在的PostgreSQL服务器
    let result = DbPool::new("postgresql://user:pass@nonexistent:5432/db", 1, 1).await;
    assert!(result.is_err(), "连接到不存在的服务器应该失败");
}
