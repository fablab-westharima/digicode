FROM ghcr.io/teamhanko/hanko:latest

COPY config.yaml /etc/hanko/config.yaml

EXPOSE 8080

CMD ["serve", "all", "--config", "/etc/hanko/config.yaml"]
