# Servidor de compilação local

**Última atualização:** 2026-05-01

Executa o servidor de compilação do DigiCode no teu próprio computador como contentor Docker, em vez de usar o servidor em nuvem. A nuvem e o local utilizam **a mesma imagem Docker**, pelo que o resultado da compilação é idêntico (sem deriva de bibliotecas).

---

## 🚀 Instalação rápida

### macOS / Linux

```bash
bash <(curl -fsSL https://raw.githubusercontent.com/fablab-westharima/digicode-installer/main/install.sh)
```

### Windows (PowerShell)

Abre o **"Windows PowerShell"** a partir do menu Iniciar — a versão padrão de 64 bits, *não* as variantes "x86" ou "ISE" que a pesquisa do Windows também mostra. No Windows 11 com o PowerShell 7 instalado, **"PowerShell"** também serve. Não requer privilégios de administrador.

```powershell
irm https://raw.githubusercontent.com/fablab-westharima/digicode-installer/main/install.ps1 | iex
```

O script descarrega a imagem Docker, inicia o contentor e verifica `http://localhost:3001/health` automaticamente.

> 💡 **Também disponível dentro do DigiCode**
> Abre Definições de Compilação → Servidor Local → **botão "Configurar"** para veres o comando específico do teu sistema operativo (com botão de cópia). Não precisas de ler a documentação.

---

## Cinco passos para terminar

1. Confirma que tens o **Docker** instalado (caso contrário, vê os [URL de transferência do Docker](#instalar-o-docker) abaixo; o script também avisa quando falta)
2. Executa o **comando de instalação rápida** acima no Terminal / PowerShell
3. Confirma o **número da porta** na pergunta (Enter para 3001 se estiver livre, ou usa a porta alternativa sugerida se 3001 estiver ocupada)
4. No DigiCode abre **Definições de Compilação → Servidor Local** (introduz a mesma porta no campo Porta se escolheste algo diferente de 3001)
5. Carrega em **«Testar ligação»** e procura «OK»

Está pronto. As próximas compilações usam o servidor local.

---

## 🗑️ Desinstalação

```bash
# macOS / Linux
bash <(curl -fsSL https://raw.githubusercontent.com/fablab-westharima/digicode-installer/main/install.sh) uninstall
```

```powershell
# Windows (PowerShell)
& ([scriptblock]::Create((irm https://raw.githubusercontent.com/fablab-westharima/digicode-installer/main/install.ps1))) uninstall
```

> 💡 **Também disponível dentro do DigiCode**
> Abre Definições de Compilação → Servidor Local → **botão "Desinstalar"** para copiar o mesmo comando.

São removidos o contentor, os volumes persistentes e a pasta de configuração; depois é-te perguntado se queres apagar também a imagem Docker (mantê-la torna a reinstalação mais rápida).

> ⚠️ **A cache de compilação também é apagada**
> A primeira compilação após desinstalar é um arranque a frio (~30–60 s).

---

## ⚠️ Tamanho da transferência

| Item | Tamanho |
|---|---|
| Imagem Docker (comprimida) | ~2.1 GB |
| Espaço em disco (após extração) | ~8.8 GB |

Usa uma **ligação fixa estável** (cerca de 1–2 minutos em fibra de 100 Mbps); o tethering do telemóvel não é recomendado.

---

## Instalar o Docker

Quando o script deteta que o Docker não está instalado, mostra URL de transferência específicos do SO.

### macOS

| Recomendado para | Ferramenta | URL |
|---|---|---|
| Apple Silicon | **OrbStack** (leve, rápida) | https://orbstack.dev/ |
| Intel / Apple Silicon | Docker Desktop for Mac | https://www.docker.com/products/docker-desktop/ |

### Windows

- **Docker Desktop for Windows** (backend WSL2; o instalador guia-te): https://www.docker.com/products/docker-desktop/
- Alternativas leves / OSS: [Rancher Desktop](https://rancherdesktop.io/), [Podman Desktop](https://podman-desktop.io/)

### Linux

```bash
# Ubuntu / Debian
sudo apt update && sudo apt install -y docker.io docker-compose-plugin
sudo systemctl enable --now docker
sudo usermod -aG docker $USER     # encerra sessão e volta a entrar para aplicar

# Fedora / RHEL / CentOS
sudo dnf install -y docker docker-compose-plugin
sudo systemctl enable --now docker
sudo usermod -aG docker $USER

# Arch / Manjaro
sudo pacman -S --needed docker docker-compose
sudo systemctl enable --now docker
sudo usermod -aG docker $USER
```

---

## Subcomandos

```bash
bash install.sh [subcomando] [--port N]
# Windows
.\install.ps1 [subcomando] [-Port N]
```

| Subcomando | Ação |
|---|---|
| `install` (predefinição) | Pergunta a porta → puxa a imagem → inicia o contentor → verifica `/health` |
| `update` | Puxa a imagem mais recente e recria o contentor (mantém a porta anterior) |
| `uninstall` | Para e remove o contentor, apaga volumes e diretório de instalação (pergunta sobre a imagem) |
| `status` | Mostra o estado do contentor, imagem, porta do anfitrião e resultado do health check |
| `start` | Inicia um contentor (parado) existente |
| `stop` | Para o contentor sem o remover (volumes preservados; reinício rápido) |
| `help` | Ajuda integrada |

`update` / `status` / `start` / `stop` leem automaticamente a porta ativa do `docker-compose.yml` gerado.

---

## Sobre a porta

O `install` pergunta sempre que porta utilizar.

- Se 3001 estiver **livre**, a predefinição é 3001 (basta carregar em Enter)
- Se 3001 estiver **ocupada**, o script mostra quem a tem (pid + nome do processo) e sugere a porta livre seguinte (por exemplo, 3002)

Quando o `curl ... | bash` (canalizado) impede o prompt, define `PORT` antes:

```bash
PORT=3001 bash -c "$(curl -fsSL .../install.sh)"
```

```powershell
$env:PORT = 3001
irm .../install.ps1 | iex
```

**Se escolheres uma porta diferente de 3001**, introduz o mesmo valor no campo Porta em Definições de Compilação → Servidor Local no DigiCode. É guardado no `localStorage`, por isso só precisas de o configurar uma vez por navegador.

---

## Resolução de problemas

### "Docker not found"

O script já indicou um URL de transferência específico do SO. Instala o Docker e volta a executar.

### "Docker is installed but not running"

Inicia o Docker Desktop / OrbStack, espera que o ícone estabilize, e volta a executar.

### Porta 3001 já em uso

O script deteta automaticamente e sugere uma porta alternativa. Aceita a predefinição ou introduz a tua — não precisas de editar o `docker-compose.yml` à mão. Reflete o mesmo valor no campo Porta da UI do DigiCode e está pronto.

### Health check expirou

O arranque a frio pode ser lento em hardware modesto. Inspeciona os registos:

```bash
docker logs digicode-compile-api
```

Se vires um panic, abre uma issue em <https://github.com/fablab-westharima/digicode-installer/issues> com o excerto do log.

### Compilação lenta em Apple Silicon

Confirma que estás a usar o Docker Desktop (build de Apple Silicon) ou o OrbStack — ambos correm arm64 nativo. A imagem compile-api é multi-arch; não deves precisar de emulação x86.

---

## Porquê usar?

- ✅ **Compilações ilimitadas** — não contam para a quota da nuvem
- ✅ **Menor latência** — sem viagem de ida e volta pela rede; recompilações quentes em segundos
- ✅ **Offline** — após o primeiro pull da imagem, não é necessária internet
- ✅ **Saída idêntica** — mesma imagem Docker que o servidor da nuvem

### Recomendação por plano

| Plano | Recomendação | Porquê |
|---|---|---|
| Free | — | As 50 compilações/mês na nuvem costumam ser suficientes |
| Lite | ▲ | Considera-o se ultrapassares 250/mês |
| Pro | ◎ | Mesmo 500/mês podem ser apertados em uso intensivo |
| Enterprise | ◎ | Aceleração de compilação para uma turma inteira; suporte offline em aulas |

### Tempos de compilação esperados

| Cenário | Tempo total |
|---|---|
| Primeira compilação (arranque a frio + transferência) | 30–60 s |
| Alteração apenas de código (warm rebuild) | ~9.6 s |
| Compilação idêntica (cache HIT) | ~1 ms |

O servidor local corre a mesma imagem Docker que a nuvem (ML30), pelo que o binário é bit-idêntico (sem deriva de bibliotecas).

---

## Documentação relacionada

- [Como começar](./getting-started.md)
- [Resolução de problemas](./troubleshooting.md)
- Código do instalador: [`fablab-westharima/digicode-installer`](https://github.com/fablab-westharima/digicode-installer) (Public, MIT)
