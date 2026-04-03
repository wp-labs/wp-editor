pub fn remove_annotations(sentence: &str) -> String {
    // 预处理：去除注释
    sentence
        .lines()
        .map(|line| {
            if let Some(comment_start) = line.find("//") {
                &line[0..comment_start]
            } else {
                line
            }
        })
        .collect::<Vec<_>>()
        .join("\n")
}
