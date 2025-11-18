FROM matrixdotorg/synapse:latest

# Download config from S3 on startup
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
