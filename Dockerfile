FROM ubuntu:24.04

ARG TARGETARCH

RUN apt-get update && \
    apt-get install -y libsqlite3-0 && \
    rm -rf /var/lib/apt/lists/*

# 创建非root用户
RUN groupadd -r appgroup && useradd -r -g appgroup appuser 
WORKDIR /app

# 根据目标架构复制预构建的二进制文件
COPY ${TARGETARCH}/wp-editor /app/wp-editor

# 复制静态资源
COPY --chown=appuser:appgroup dist /app/web/dist

# 设置权限
RUN chown -R appuser:appgroup /app && \
    chmod +x /app/wp-editor

USER appuser

EXPOSE 8080
CMD ["/app/wp-editor"]