# Guia de Instalação do PointControl no Ubuntu Linux

Este é um passo a passo completo para configurar, instalar e rodar o PointControl (uma aplicação Next.js) em um servidor ou máquina local rodando **Ubuntu**.

---

## 1. Atualizar o sistema

Antes de começar, certifique-se de que os pacotes do seu sistema estão atualizados. Abra o terminal e execute:

```bash
sudo apt update && sudo apt upgrade -y
```

## 2. Instalar o Node.js e NPM

O PointControl exige o Node.js (versão 20 ou superior recomendada). A melhor forma de instalar versões atualizadas no Ubuntu é usando o repositório NodeSource.

Execute os seguintes comandos para instalar o Node.js v20:

```bash
# Baixar e importar a chave do NodeSource
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -

# Instalar o Node.js
sudo apt-install -y nodejs
```

Verifique se a instalação foi bem-sucedida verificando as versões:

```bash
node -v
npm -v
```

## 3. Instalar o Git (Opcional, mas recomendado)

Se você for baixar o código através de um repositório (como o GitHub ou GitLab), precisará do Git:

```bash
sudo apt install git -y
```

## 4. Baixar / Copiar o Código Fonte

Se o código estiver em um repositório Git, clone-o:

```bash
git clone <URL_DO_SEU_REPOSITORIO>
cd PointControl
```

*Nota: Se você tiver o código compactado (.zip), você pode usar `unzip pointcontrol.zip` e então acessar a pasta.*

## 5. Instalar as Dependências do Projeto

Dentro da pasta do projeto `PointControl`, instale todas as bibliotecas necessárias rodando o npm:

```bash
npm install
```

## 6. Rodar o Projeto

Você tem duas opções para rodar o projeto: **Modo de Desenvolvimento** (para testar e modificar o código) ou **Modo de Produção** (para uso real e melhor performance).

### Opção A: Modo de Desenvolvimento

Ideal se você ainda estiver mexendo no código. Ele atualiza a página sozinho ao salvar arquivos.

```bash
npm run dev
```

O projeto estará disponível no seu navegador em: `http://localhost:3000` (ou o IP da máquina, caso esteja em um servidor).

### Opção B: Modo de Produção (Recomendado para uso oficial)

Se a aplicação já estiver pronta para uso, você deve compilar o projeto primeiro para garantir que ele rode o mais rápido possível.

```bash
# 1. Compilar o projeto
npm run build

# 2. Iniciar o servidor de produção
npm start
```

---

## 7. Rodar o Projeto em Background com PM2 (Opcional - Para Servidores)

Se você instalou o PointControl em um servidor Ubuntu e quer que ele continue rodando mesmo se você fechar o terminal (ou se o servidor reiniciar), use o **PM2**.

1. Instale o PM2 globalmente:
```bash
sudo npm install -g pm2
```

2. Compile o projeto (se ainda não o fez):
```bash
npm run build
```

3. Inicie o PointControl pelo PM2:
```bash
pm2 start npm --name "pointcontrol" -- start
```

4. Configurar para iniciar automaticamente caso o servidor reinicie:
```bash
pm2 startup
pm2 save
```

Para verificar os logs ou parar a aplicação no futuro:
- Ver logs: `pm2 logs pointcontrol`
- Parar: `pm2 stop pointcontrol`
- Reiniciar: `pm2 restart pointcontrol`

---

### Resolução de Problemas Comuns

- **Erro de Permissão no npm install:** Se der erro de acesso negado (EACCES), **evite** usar `sudo npm install`. Em vez disso, garanta que seu usuário tem permissão na pasta: `sudo chown -R $USER:$USER /caminho/para/PointControl`.
- **Porta 3000 em uso:** Se a porta já estiver ocupada, você pode iniciar o PointControl em outra porta. Ex: `npm start -- -p 3001`
