FROM ghcr.io/teamhanko/hanko:latest

COPY config.yaml /etc/hanko/config.yaml

EXPOSE 8080

CMD ["serve", "public", "--config", "/etc/hanko/config.yaml"]
