# Configuração do Servidor de Compilação Local

**Última atualização:** 2026-04-29

Podes executar um servidor de compilação no teu próprio computador em vez do servidor na nuvem do DigiCode. A nuvem e o local utilizam **a mesma imagem Docker**, pelo que os resultados de compilação são idênticos (sem lib drift).

---

## Casos de uso

- **Compilações ilimitadas** — não consome a quota da nuvem
- **Compilação rápida** — sem latência de rede, a cache persistente entrega ~1 ms em cache HIT e ~9,6 s em warm rebuild
- **Utilização offline** — não é necessária ligação à Internet após a descarga inicial

### Recomendação por plano

| Plano | Recomendação | Razão |
|-------|:------------:|-------|
| Free | — | A quota na nuvem (50/mês) é normalmente suficiente |
| Lite | ▲ | A considerar caso 250/mês não chegue |
| Pro | ◎ | Para utilização intensiva acima de 500/mês |
| Enterprise | ◎ | Eficaz para compilação a nível de turma |

---

## ⚠️ Notas importantes

> **Aviso: tamanho da imagem Docker**
>
> Imagem Docker do servidor de compilação local (baseada em PlatformIO Core, v0.1.0):
>
> - **Descarga (comprimida): ~1 GB**
> - **Espaço em disco (descomprimida): ~3,8 GB**
>
> - **Não descarregues por tethering do telemóvel** — utiliza uma ligação fixa estável (fibra, etc.)
> - Tempo estimado: ~1-2 min em fibra de 100 Mbps

---

## Requisitos

Necessitas de um ambiente com Docker. Escolhe uma das seguintes opções.

### Opção A: Docker Desktop (Padrão)

- Compatível com **Windows / Mac / Linux**
- **Gratuito para utilização pessoal**; planos pagos necessários para utilização comercial
- https://www.docker.com/products/docker-desktop/

### Opção B: Alternativas ao Docker Desktop (leves / OSS)

Para utilização comercial ou se preferires uma solução mais leve:

| Ferramenta | SO | Características |
|------------|----|-----------------|
| **OrbStack** | macOS | Leve, rápido, baixo consumo de memória, nativo em Apple Silicon |
| **Rancher Desktop** | Windows / macOS / Linux | OSS (gratuito) |
| **Podman Desktop** | Windows / macOS / Linux | OSS, sem daemon |

### Opção C: Docker Engine diretamente (Linux)

No Linux podes instalar o Docker Engine diretamente, sem o Docker Desktop.

---

## Passo 1: Instalar o ambiente Docker

### Windows

1. Descarrega o Docker Desktop for Windows em https://www.docker.com/products/docker-desktop/
2. Executa o instalador (é necessário WSL2; o instalador guia-te)
3. Reinicia o PC após a instalação

### Mac (Intel)

1. Descarrega o Docker Desktop for Mac (Intel) em https://www.docker.com/products/docker-desktop/
2. Abre o `.dmg` e arrasta para Aplicações
3. Inicia "Docker" a partir de Aplicações

### Mac (Apple Silicon: M1/M2/M3/M4)

**Recomendado: OrbStack**

O Docker Desktop for Mac (Apple Silicon) funciona, mas o OrbStack é mais rápido e consome menos memória.

1. Descarrega o OrbStack em https://orbstack.dev/
2. Após a instalação, o comando `docker` fica imediatamente disponível

Se utilizares o Docker Desktop, instala a versão para Apple Silicon (`.dmg`).

> O core do ESP32 suporta arm64 de forma nativa, pelo que a emulação x86 não é necessária em utilização normal.

### Linux

```bash
# Ubuntu / Debian
sudo apt update && sudo apt install -y docker.io
sudo systemctl enable --now docker
sudo usermod -aG docker $USER
# Termina sessão e volta a iniciar para aplicar a mudança de grupo
```

### Verificar a instalação

```bash
docker --version
```

Se vires `Docker version 20.x.x`, está pronto.

---

## Passo 2: Descarregar e iniciar o servidor de compilação

### Método A: arranque numa só linha

```bash
docker run -d -p 3001:3001 --name digicode-compile-api \
  ghcr.io/fablab-westharima/digicode-compile-api:latest
```

A primeira execução descarrega ~1 GB (3,8 GB descomprimidos). **Utiliza uma ligação fixa.**

### Método B: docker-compose.yml (recomendado, com cache persistente)

Cria um ficheiro `docker-compose.yml` em qualquer pasta:

```yaml
services:
  digicode-compile-api:
    image: ghcr.io/fablab-westharima/digicode-compile-api:latest
    container_name: digicode-compile-api
    ports:
      - "3001:3001"
    restart: unless-stopped
    volumes:
      - digicode-projects:/opt/digicode-compile/projects
      - digicode-cache:/opt/digicode-compile/cache

volumes:
  digicode-projects:
  digicode-cache:
```

Depois, nessa pasta:

```bash
docker compose up -d
```

> `digicode-projects` e `digicode-cache` são volumes nomeados que persistem o estado de compilação. **Uma segunda compilação com código idêntico demora ~1 ms (cache HIT)**, e uma alteração de 1 byte completa o warm rebuild em ~9,6 s. Com volumes efémeros (`docker run` sem `-v`), a cache perde-se ao remover o contentor.

---

## Passo 3: Verificar

```bash
curl http://localhost:3001/health
```

Se vires o seguinte, está a funcionar (verifica `service` e `version`):

```json
{
  "status": "ok",
  "service": "digicode-compile-api",
  "version": "0.1.0",
  "timestamp": "..."
}
```

Também podes visitar `http://localhost:3001/health` no navegador.

---

## Passo 4: Configurar o DigiCode

1. Abre o DigiCode
2. Clica em ▼ ao lado do botão **"Carregar"**
3. Seleciona **"Servidor local"**
4. Executa uma compilação para verificar

A primeira compilação (cold) demora ~30-60 s — o PlatformIO + framework + bibliotecas estão dentro da imagem, pelo que o resultado coincide byte a byte com a nuvem (ML30).

---

## Migração a partir da imagem anterior (utilizadores existentes, 1 passo)

Até 2026-04 distribuímos `ghcr.io/fablab-westharima/digicode-compile-server` (baseada em arduino-cli). A migração para a nova `digicode-compile-api` (baseada em PlatformIO Core) consiste **apenas em mudar o nome da imagem**.

```bash
# Parar e remover a imagem anterior
docker stop digicode-compiler 2>/dev/null
docker rm digicode-compiler 2>/dev/null
docker rmi ghcr.io/fablab-westharima/digicode-compile-server:latest 2>/dev/null

# Iniciar a nova imagem
docker pull ghcr.io/fablab-westharima/digicode-compile-api:latest
docker run -d -p 3001:3001 --name digicode-compile-api \
  ghcr.io/fablab-westharima/digicode-compile-api:latest
```

**Alterações:**

- Nome da imagem: `digicode-compile-server` → `digicode-compile-api`
- Nome do contentor: `digicode-compiler` → `digicode-compile-api` (opcional)
- Porta: 3001 inalterada
- Definição do DigiCode (URL `http://localhost:3001`): inalterada
- Contrato API: compatível — apenas os campos `service` / `version` em `/health` mudam

O repositório antigo [fablab-westharima/arduino-compile-server](https://github.com/fablab-westharima/arduino-compile-server) foi arquivado em 2026-04-29. As correções de bibliotecas feitas na nuvem (QTRSensors / MFRC522 I2C / NewPing v1.9, etc.) estão apenas na nova imagem, pelo que se recomenda migrar.

---

## Operações do servidor

```bash
# Parar
docker stop digicode-compile-api

# Reiniciar
docker start digicode-compile-api

# Ver logs
docker logs digicode-compile-api

# Remover por completo
docker rm -f digicode-compile-api
docker rmi ghcr.io/fablab-westharima/digicode-compile-api:latest
```

---

## Atualizações

Quando uma nova versão é publicada:

```bash
# docker-compose
docker compose pull
docker compose up -d
```

```bash
# docker run
docker stop digicode-compile-api
docker rm digicode-compile-api
docker pull ghcr.io/fablab-westharima/digicode-compile-api:latest
docker run -d -p 3001:3001 --name digicode-compile-api \
  ghcr.io/fablab-westharima/digicode-compile-api:latest
```

---

## Resolução de problemas

### Porta 3001 em utilização

Se outra aplicação utiliza a porta 3001:

```bash
# Usa a porta 3002
docker run -d -p 3002:3001 --name digicode-compile-api \
  ghcr.io/fablab-westharima/digicode-compile-api:latest
```

Altera o URL do servidor para `http://localhost:3002` nas definições do DigiCode.

### O Docker não arranca (Windows)

- Verifica que o WSL2 está instalado
- Confirma que a virtualização está ativada na BIOS/UEFI
- Reinicia o PC

### O Docker não arranca (Mac)

- Permite o Docker em Definições do Sistema > Privacidade e Segurança
- Reinicia o Mac

### Erros de compilação em Apple Silicon

- Verifica que utilizas o OrbStack ou o Docker Desktop para Apple Silicon
- Confirma que a emulação x86 não é necessária (o core do ESP32 é arm64 nativo)

### Erro de compilação

```bash
# Reinicia o contentor
docker restart digicode-compile-api

# Se continuar a falhar, recria
docker rm -f digicode-compile-api
docker run -d -p 3001:3001 --name digicode-compile-api \
  ghcr.io/fablab-westharima/digicode-compile-api:latest
```

### A cache não dá HIT (o mesmo código provoca warm rebuild)

Verifica a secção `volumes` do teu `docker-compose.yml`. Os volumes nomeados `digicode-projects` e `digicode-cache` têm de ser mantidos.

---

## Vantagens e desvantagens

| Aspeto | Conteúdo |
|--------|----------|
| ✅ Compilações | **Ilimitadas** (não consome quota da nuvem) |
| ✅ Velocidade | cache HIT ~1 ms / warm rebuild ~9,6 s / cold ~30-60 s |
| ✅ Offline | Sem Internet após a descarga inicial (framework + bibliotecas na imagem) |
| ✅ Igual à nuvem | Mesma imagem que a nuvem (ML30) — saída binária coincide fisicamente (sem lib drift) |
| ⚠️ Descarga inicial | ~1 GB comprimido, ~3,8 GB descomprimido |
| ⚠️ Instalação | É necessário instalar o Docker |
| ⚠️ Recursos | Utiliza memória e CPU do PC (mínimo 4 GB de RAM recomendados) |

---

## Documentos relacionados

- [Primeiros passos](./getting-started.md) — Utilização básica
- [Resolução de problemas](./troubleshooting.md) — Problemas e soluções comuns
