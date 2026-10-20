# MeuTube

Site gratuito para enviar, listar e assistir **videos** e **imagens**.

## Rodar no seu computador

Precisa do [Node.js](https://nodejs.org) 18 ou mais novo.

```bash
npm install
npm start
```

Abra http://localhost:3000.

## Configuracao (variaveis de ambiente)

| Variavel | Padrao | Para que serve |
| --- | --- | --- |
| `PORT` | `3000` | Porta do servidor |
| `DATA_DIR` | pasta do projeto | Onde ficam o banco (`videos.db`) e a pasta `uploads/` |
| `MAX_UPLOAD_MB` | `500` | Tamanho maximo de cada arquivo |

Os arquivos enviados ficam em disco, entao na hospedagem `DATA_DIR` precisa apontar para um disco persistente.

## Rodar com Docker

```bash
docker build -t meutube .
docker run -p 3000:3000 -v meutube-data:/data meutube
```
