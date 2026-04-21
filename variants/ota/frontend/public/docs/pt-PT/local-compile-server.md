# Configuração do Servidor de Compilação Local

**Última atualização:** 2026-04-21

Podes executar um servidor de compilação no teu próprio computador em vez do servidor na nuvem do DigiCode.

---

## Casos de Uso

- **Compilações ilimitadas** — sem consumo de quota na nuvem
- **Compilação rápida** — sem latência de rede
- **Uso offline** — sem internet após descarregamento inicial

### Recomendações por Plano

| Plano | Recomendação | Razão |
|-------|:------------:|-------|
| Free | — | A quota de compilação na nuvem (50/mês) geralmente é suficiente |
| Lite | ▲ | Considera se 250/mês não for suficiente |
| Pro | ◎ | Para uso de alta frequência que excede os 500/mês |
| Enterprise | ◎ | Eficaz para compilação ao nível de toda a turma |

---

## ⚠️ Notas Importantes

> **Nota: Tamanho da imagem Docker**
>
> A imagem Docker do servidor de compilação local tem aproximadamente **10 GB**.
>
> - **Não descarregar por tethering de telemóvel** (pode exceder limite de dados ou gerar cobranças elevadas)
> - **Usar uma ligação fixa estável (fibra ótica, etc.)**
> - Tempo estimado de descarregamento: ~15-20 min a 100 Mbps de fibra

---

## Requisitos

Precisas de um ambiente com Docker. Escolhe uma das seguintes opções.

### Opção A: Docker Desktop (Padrão)

- Compatível com **Windows / Mac / Linux**
- **Gratuito para uso pessoal**; planos pagos necessários para uso comercial
- https://www.docker.com/products/docker-desktop/

### Opção B: Alternativas ao Docker Desktop (Leve / OSS)

Para uso comercial ou se preferires uma solução mais leve:

| Ferramenta | SO | Características |
|------------|----|--------------:|
| **OrbStack** | macOS | Leve, rápido, baixo consumo de memória, nativo Apple Silicon |
| **Rancher Desktop** | Windows / macOS / Linux | OSS (gratuito) |
| **Podman Desktop** | Windows / macOS / Linux | OSS, sem daemon |

### Opção C: Docker Engine Diretamente (Linux)

No Linux podes instalar o Docker Engine diretamente sem o Docker Desktop.

---

## Passo 1: Instalar o Ambiente Docker

### Windows

1. Descarregar Docker Desktop for Windows de https://www.docker.com/products/docker-desktop/
2. Executar o instalador (necessário WSL2, o instalador irá guiar-te)
3. Reiniciar PC após instalação

### Mac (Intel)

1. Descarregar Docker Desktop for Mac (Intel) de https://www.docker.com/products/docker-desktop/
2. Abrir `.dmg` e arrastar para Applications
3. Abrir "Docker" em Applications

### Mac (Apple Silicon: M1/M2/M3/M4)

**Recomendado: OrbStack**

O Docker Desktop for Mac (versão Apple Silicon) funciona, mas o OrbStack é mais rápido e usa menos memória.

1. Descarregar OrbStack de https://orbstack.dev/
2. Após instalar, o comando `docker` fica disponível imediatamente

Se usares Docker Desktop, instala a versão Apple Silicon (`.dmg`).

> O núcleo ESP32 já suporta arm64 nativamente, por isso geralmente não é necessária emulação x86.

### Linux

```bash
# Ubuntu / Debian
sudo apt update && sudo apt install -y docker.io
sudo systemctl enable --now docker
sudo usermod -aG docker $USER
# Terminar e reiniciar sessão para aplicar mudança de grupo
```

### Verificar Instalação

```bash
docker --version
```

Se vires `Docker version 20.x.x`, estás pronto.

---

## Passo 2: Descarregar e Iniciar o Servidor de Compilação

### Método A: Inicio com um comando (recomendado)

```bash
docker run -d -p 3001:3001 --name digicode-compiler \
  ghcr.io/fablab-westharima/digicode-compile-server:latest
```

A primeira execução descarrega ~10 GB de imagem. **Usa uma ligação fixa.**

### Método B: Usar docker-compose

Criar um ficheiro `docker-compose.yml` em qualquer pasta:

```yaml
services:
  digicode-compiler:
    image: ghcr.io/fablab-westharima/digicode-compile-server:latest
    container_name: digicode-compiler
    ports:
      - "3001:3001"
    restart: unless-stopped
```

Depois nessa pasta:

```bash
docker compose up -d
```

---

## Passo 3: Verificar

```bash
curl http://localhost:3001/health
```

Se vires o seguinte, está a funcionar:

```json
{"status":"ok","timestamp":"...","service":"digicode-compile-server","templateAvailable":true}
```

Também podes visitar `http://localhost:3001/health` no navegador.

---

## Passo 4: Configurar no DigiCode

1. Abrir DigiCode
2. Clicar em ▼ junto ao botão **"Carregar"**
3. Selecionar **"Servidor Local"**
4. Executar uma compilação para verificar

---

## Operações do Servidor

```bash
# Parar
docker stop digicode-compiler

# Reiniciar
docker start digicode-compiler

# Ver registos
docker logs digicode-compiler

# Remover completamente
docker rm -f digicode-compiler
docker rmi ghcr.io/fablab-westharima/digicode-compile-server:latest
```

---

## Atualizações

Quando for lançada uma nova versão:

```bash
docker stop digicode-compiler
docker rm digicode-compiler
docker pull ghcr.io/fablab-westharima/digicode-compile-server:latest
docker run -d -p 3001:3001 --name digicode-compiler \
  ghcr.io/fablab-westharima/digicode-compile-server:latest
```

---

## Resolução de Problemas

### Porta 3001 em Uso

Se outra aplicação usa a porta 3001:

```bash
# Usar porta 3002
docker run -d -p 3002:3001 --name digicode-compiler \
  ghcr.io/fablab-westharima/digicode-compile-server:latest
```

Alterar o URL do servidor para `http://localhost:3002` nas configurações do DigiCode.

### Docker Não Inicia (Windows)

- Verificar se WSL2 está instalado
- Verificar se virtualização está ativada no BIOS/UEFI
- Reiniciar PC

### Docker Não Inicia (Mac)

- Permitir Docker em Definições do sistema > Privacidade e segurança
- Reiniciar Mac

### Erros de Compilação no Apple Silicon

- Verificar se estás a usar OrbStack ou Docker Desktop for Apple Silicon
- Confirmar que não é necessária emulação x86 (núcleo ESP32 já é nativo arm64)

### Erro de Compilação

```bash
# Reiniciar contentor
docker restart digicode-compiler

# Se ainda falhar, recriar
docker rm -f digicode-compiler
docker run -d -p 3001:3001 --name digicode-compiler \
  ghcr.io/fablab-westharima/digicode-compile-server:latest
```

---

## Prós e Contras

| Elemento | Conteúdo |
|----------|---------|
| ✅ Compilações | **Ilimitadas** (sem quota na nuvem) |
| ✅ Velocidade | Sem latência de rede |
| ✅ Offline | Sem internet após descarregamento |
| ⚠️ Descarregamento inicial | ~10 GB (ligação fixa recomendada) |
| ⚠️ Instalação | Requer configuração Docker |
| ⚠️ Recursos | Usa memória e CPU do PC (mínimo 4 GB RAM recomendado) |

---

## Documentos Relacionados

- [Primeiros Passos](./getting-started.md) — Uso básico
- [Resolução de Problemas](./troubleshooting.md) — Problemas comuns e soluções
