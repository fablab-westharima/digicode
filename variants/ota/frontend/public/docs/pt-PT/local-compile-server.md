# Servidor de compilação local

**Última atualização:** 2026-05-01

Executa o servidor de compilação do DigiCode no teu próprio computador como contentor Docker, em vez de usar o servidor em nuvem. A nuvem e o local utilizam **a mesma imagem Docker**, pelo que o resultado da compilação é idêntico (sem deriva de bibliotecas).

---

## 🟡 Antes de começar: recomendação por SO

| SO | Servidor local | Notas |
|---|---|---|
| **macOS** | 🥇 OK para utilização geral | OrbStack (recomendado em Apple Silicon) um clique + uma linha `bash <(curl ...)` |
| **Linux** | 🥇 OK para utilização geral | apt / dnf / pacman para instalar o Docker e uma linha sh |
| **Windows** | 🟡 **Utilizadores avançados** | Vários pré-requisitos específicos do Windows (BIOS / WSL / Docker Desktop) tornam isto difícil para principiantes |

> ⚠️ **Aviso para utilizadores de Windows**
>
> Configurar o servidor de compilação local (esta página) e **upload WiFi OTA** são **avançados** no Windows. Dependem de vários pré-requisitos específicos do Windows (activar virtualização na BIOS, actualizar WSL2, instalar e configurar o Docker Desktop) que se acumulam para alguém novo em ambientes de desenvolvimento.
>
> **Para utilizadores principiantes de Windows recomendamos:**
> - 🥇 **Compilação na nuvem** — mesmo o plano Free dá 50 compilações/mês, com mais nos planos pagos
> - 🥇 **Upload USB** ou **Bluetooth (BLE) OTA** — ambos guiados pela GUI integrada do DigiCode, sem instalação extra
>
> Tenta o caminho do servidor local / WiFi OTA quando te sentires confortável com ambientes de desenvolvimento. A secção Resolução de problemas abaixo cobre os obstáculos específicos do Windows, mas a primeira vez tende a exigir paciência.
>
> Utilizadores Mac / Linux: saltem directamente para a instalação rápida abaixo.

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

**🥇 Recomendado: Microsoft Store**

Pesquisa «Docker Desktop» na Microsoft Store, confirma que o editor é **Docker Inc** e clica em «Instalar». O MSIX é gerido pelo sistema operativo, não abre janelas adicionais durante a instalação e atualiza automaticamente. Melhor opção predefinida para utilizadores gerais.

**Instalador directo (.exe)**

- [Docker Desktop for Windows](https://www.docker.com/products/docker-desktop/) (backend WSL2; o instalador guia-te)

> ⚠️ **Importante**: NÃO feches nenhuma janela que o instalador abra (incluindo subprocessos cmd / PowerShell que lance) até a instalação terminar. Fechar uma a meio deixa `C:\ProgramData\DockerDesktop` num estado partido e todas as tentativas seguintes falham com «ProgramData\DockerDesktop must be owned by an elevated account» (consulta [Resolução de problemas](#a-instalação-do-docker-falha-com-cprogramdatadockerdesktop-must-be-owned-by-an-elevated-account) abaixo).

**Alternativas leves / OSS**

[Rancher Desktop](https://rancherdesktop.io/), [Podman Desktop](https://podman-desktop.io/)

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

### A instalação do Docker falha com «C:\ProgramData\DockerDesktop must be owned by an elevated account»

**Causa**: uma instalação anterior do Docker Desktop ficou interrompida — normalmente porque o instalador lançou uma janela secundária cmd / PowerShell e o utilizador fechou-a antes do fim. A pasta `C:\ProgramData\DockerDesktop` fica com um proprietário incorrecto, e todas as tentativas seguintes (incluindo a versão da Microsoft Store) batem na mesma verificação de permissões.

**Solução**: abre **PowerShell como administrador** (menu Iniciar → botão direito em PowerShell → «Executar como administrador»), corre os 4 comandos abaixo e volta a executar o instalador do Docker Desktop:

```powershell
Remove-Item "C:\ProgramData\DockerDesktop" -Recurse -Force
New-Item -ItemType Directory -Path "C:\ProgramData\DockerDesktop" -Force | Out-Null
icacls "C:\ProgramData\DockerDesktop" /setowner "*S-1-5-32-544" /T
icacls "C:\ProgramData\DockerDesktop" /grant "*S-1-5-32-544:(OI)(CI)F" /T
```

`*S-1-5-32-544` é o SID do grupo Administradores e funciona tanto em Windows em inglês como em japonês. Aplica o mesmo procedimento se a versão da Store também der este erro — o seu caminho de instalação corre igualmente a verificação de permissões do Docker.

> 💡 **Prevenção**: com o instalador .exe nunca feches as janelas secundárias durante a instalação. Se preferires evitar o risco, usa a instalação a partir da Microsoft Store — o MSIX não abre janelas adicionais.

### Docker Desktop falha a iniciar com «Virtualization support not detected»

**Causa**: a virtualização por hardware (Intel VT-x / AMD-V) está desactivada na BIOS / UEFI. O CPU suporta-a mas o sistema operativo não a vê.

**Verificação**: Gestor de tarefas (Ctrl + Shift + Esc) → separador «Desempenho» → CPU → campo «Virtualização». Se aparecer «Desactivado», é preciso mudar a BIOS.

**Solução**:

1. Reinicia → durante o logótipo de arranque carrega a tecla da BIOS (DELL / ASUS = `F2` ou `Del`, HP = `F10`, Lenovo = `F1` / `F2`, computadores feitos à medida dependem do fabricante da motherboard)
2. Na BIOS / UEFI, activa uma das opções:
   - CPU Intel: **Virtualization Technology (VTx)** / **Intel VT-x**
   - CPU AMD: **SVM Mode** / **AMD-V**
3. A localização varia conforme o fabricante: normalmente em `Advanced`, `System Options`, `CPU Configuration` ou `Security`
4. `F10` (Save & Exit) → Sim → reinicia
5. Depois do Windows arrancar, volta ao Gestor de tarefas → CPU → «Virtualização: Activado» → inicia o Docker Desktop

> ⚠️ Não mexas em `Intel Trusted Execution Technology (TXT)` nem `DMA Protection` — podem impedir o arranque do Windows e o Docker não os utiliza.

### Docker Desktop falha a iniciar com «WSL needs updating»

O kernel do WSL2 (Subsistema do Windows para Linux) está desactualizado e o Docker Desktop não consegue arrancar.

**Solução**: abre o PowerShell (administrador recomendado):

```powershell
wsl --update
```

A transferência + instalação dura ~30-60 segundos. Quando terminar, volta ao Docker Desktop e clica em **Try Again**. A barra de estado deve passar de `Engine starting` a `Engine running`.

> Se o próprio `wsl --update` falhar com «WSL não está instalado», corre `wsl --install` a partir do **PowerShell como administrador** (caminho de instalação limpa; pode exigir reiniciar o Windows).

### Ecrã de início de sessão «Welcome to Docker» na primeira execução do Docker Desktop

Clica em **Skip** no canto superior direito. O servidor de compilação local do DigiCode funciona sem conta Docker Hub — a nossa imagem está no GitHub Container Registry (`ghcr.io`) e descarrega-se anonimamente.

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
