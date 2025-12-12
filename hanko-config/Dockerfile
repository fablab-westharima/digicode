FROM ghcr.io/teamhanko/hanko:latest

COPY config.yaml /etc/hanko/config.yaml
COPY entrypoint.sh /entrypoint.sh

RUN chmod +x /entrypoint.sh

EXPOSE 8080

ENTRYPOINT ["/entrypoint.sh"]
