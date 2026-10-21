# Colocar o MeuTube no ar na Oracle Cloud (gratis)

O plano **Always Free** da Oracle da um servidor que nunca expira e ate 200 GB de disco.
O cadastro pede cartao de credito so para verificar identidade; nada e cobrado enquanto voce usar apenas recursos "Always Free".

## 1. Criar a conta

1. Acesse https://www.oracle.com/cloud/free/ e clique em **Start for free**.
2. Escolha a regiao **Brazil East (Sao Paulo)** ou **Brazil Southeast (Vinhedo)**. Ela nao pode ser trocada depois.

## 2. Criar o servidor (instancia)

1. No painel: **Compute > Instances > Create instance**.
2. **Image**: Ubuntu 22.04 ou 24.04.
3. **Shape**: clique em *Change shape* > **Ampere** > `VM.Standard.A1.Flex`, com 2 OCPU e 12 GB de memoria (fica dentro do gratis).
   Se aparecer "Out of capacity", tente outro *Availability domain* ou tente de novo mais tarde.
4. **Boot volume**: marque *Specify a custom boot volume size* e coloque ate **150 GB** (e onde os videos vao ficar).
5. Em **Add SSH keys**, clique em *Save private key* e guarde o arquivo.
6. Clique em **Create** e anote o **Public IP address**.

## 3. Liberar as portas 80 e 443

1. Na pagina da instancia, clique na **Subnet** > **Security Lists** > *Default Security List*.
2. **Add Ingress Rules**: Source CIDR `0.0.0.0/0`, IP Protocol TCP, Destination Port Range `80,443`.

## 4. Entrar no servidor

No Windows (PowerShell), macOS ou Linux:

```bash
ssh -i caminho/da/chave.key ubuntu@SEU_IP
```

## 5. Instalar e rodar

Cole tudo de uma vez no servidor:

```bash
# Firewall interno do Ubuntu da Oracle
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 443 -j ACCEPT
sudo netfilter-persistent save

# Docker
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker ubuntu

# Site
git clone https://github.com/matheus26122005-bit/meutube.git
cd meutube
IP=$(curl -s https://api.ipify.org)
echo "SITE_ADDRESS=$(echo $IP | tr . -).sslip.io" > .env
sudo docker compose up -d --build
cat .env
```

Em 1 ou 2 minutos o site abre em `https://` + o endereco mostrado no fim (algo como `https://123-45-67-89.sslip.io`), ja com cadeado (HTTPS gratis).

Se tiver um dominio proprio, aponte um registro **A** para o IP e troque o valor de `SITE_ADDRESS` no `.env` pelo dominio.

## Atualizar o site depois de mudancas no GitHub

```bash
cd ~/meutube && git pull && sudo docker compose up -d --build
```

## Onde ficam os arquivos

Videos, imagens e o banco ficam em `~/meutube/data`. Para fazer backup:

```bash
tar czf meutube-backup.tgz -C ~/meutube data
```

## Problemas comuns

- **Site nao abre**: confira o passo 3 (Security List) e os comandos `iptables` do passo 5.
- **Ver erros**: `cd ~/meutube && sudo docker compose logs -f`
- **Limite de upload**: adicione `MAX_UPLOAD_MB=1000` ao `.env` e rode `sudo docker compose up -d`.
