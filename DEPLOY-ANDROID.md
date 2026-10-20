# Rodar o MeuTube no celular Android

O celular vira o servidor e o Cloudflare Tunnel cria um link publico `https://` gratis, sem mexer no roteador.

**Limites:** o celular precisa ficar ligado, carregando e no Wi-Fi; os arquivos ocupam a memoria do celular;
cada upload pode ter no maximo ~95 MB; o link `trycloudflare.com` muda sempre que voce reinicia.

## 1. Instalar o Termux

Instale o **Termux** pelo **F-Droid** (https://f-droid.org/packages/com.termux/).
A versao da Play Store e antiga e nao funciona direito.

Depois, nas configuracoes do Android: **Apps > Termux > Bateria > Sem restricoes**,
para o Android nao fechar o servidor.

## 2. Instalar o necessario (so na primeira vez)

Abra o Termux e cole:

```bash
pkg update -y && pkg upgrade -y
pkg install -y nodejs-lts git python make clang binutils cloudflared termux-api
mkdir -p ~/.gyp && echo "{'variables':{'android_ndk_path':''}}" > ~/.gyp/include.gypi
git clone https://github.com/matheus26122005-bit/meutube.git
cd meutube
npm install
```

O `npm install` pode demorar alguns minutos, porque compila o banco de dados (sqlite3) no proprio celular.

## 3. Colocar o site no ar

```bash
cd ~/meutube
bash celular.sh
```

Em alguns segundos aparece:

```
 Seu site esta no ar: https://algumas-palavras.trycloudflare.com
```

Compartilhe esse link. Deixe o Termux aberto (pode minimizar).

## Proximas vezes

Abra o Termux e rode de novo `cd ~/meutube && bash celular.sh`. Um link novo sera gerado.

## Atualizar o site

```bash
cd ~/meutube && git pull && npm install
```

## Onde ficam os arquivos

Em `~/meutube-dados` (banco `videos.db` e pasta `uploads/`).

## Problemas comuns

- **Erro no `npm install`**: rode `pkg install -y python make clang binutils` de novo e repita `npm install`. Se continuar, mande a mensagem de erro.
- **Site cai quando a tela apaga**: confira a opcao de bateria do passo 1. O script ja ativa o *wake lock* do Termux.
- **Ver erros do servidor**: `cat ~/meutube.log`
