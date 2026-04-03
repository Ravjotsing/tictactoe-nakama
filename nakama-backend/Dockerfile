FROM heroiclabs/nakama:3.22.0

COPY data/modules/ /nakama/data/modules/

EXPOSE 7349 7350 7351

CMD ["/bin/sh", "-c", "/nakama/nakama migrate up --database.address postgres:LCRAfIQSjiPPKgjMjzpDrqUzfIpRkAms@postgres.railway.internal:5432/railway?sslmode=disable && /nakama/nakama --name nakama1 --database.address postgres:LCRAfIQSjiPPKgjMjzpDrqUzfIpRkAms@postgres.railway.internal:5432/railway?sslmode=disable --logger.level INFO --runtime.js_entrypoint index.js --runtime.path /nakama/data/modules --socket.server_key defaultkey --console.username admin --console.password admin --session.token_expiry_sec 7200"]
