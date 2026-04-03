FROM heroiclabs/nakama:3.22.0

COPY data/modules/ /nakama/data/modules/

EXPOSE 7349 7350 7351

CMD ["/bin/sh", "-c", "/nakama/nakama migrate up --database.address postgres:LCRAfIQSjiPPKgjMjzpDrqUzfIpRkAms@turntable.proxy.rlwy.net:32159/railway && /nakama/nakama --name nakama1 --database.address postgres:LCRAfIQSjiPPKgjMjzpDrqUzfIpRkAms@turntable.proxy.rlwy.net:32159/railway --logger.level INFO --runtime.js_entrypoint index.js --runtime.path /nakama/data/modules --socket.server_key defaultkey --console.username admin --console.password admin"]
