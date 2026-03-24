# Configuração do Servidor de Compilação Local

Execute um servidor de compilação no seu computador em vez do servidor na nuvem.

---

## Aviso Importante

> A imagem Docker é de **aproximadamente 10GB**.
> Use ligação por cabo estável para transferência.

---

## Requisitos

- **Docker Desktop** (gratuito)
- Espaço em disco: 15GB+

---

## Passo 1: Instalar Docker Desktop

### Windows/Mac

1. Visite [Docker Desktop](https://www.docker.com/products/docker-desktop/)
2. Transfira e instale
3. Reinicie após instalação

---

## Passo 2: Iniciar Servidor

```bash
docker run -d -p 3001:3001 --name digicode-compiler digicollc/digicode-compile-server:latest
```

---

## Passo 3: Verificar

```bash
curl http://localhost:3001/health
```

---

## Passo 4: Configurar DigiCode

1. Abra DigiCode
2. Clique em ▼ junto a "**Carregar**"
3. Selecione "**Servidor Local**"

---

## Operações

| Comando | Ação |
|---------|------|
| `docker stop digicode-compiler` | Parar |
| `docker start digicode-compiler` | Iniciar |
| `docker logs digicode-compiler` | Ver logs |

---

## Vantagens e Desvantagens

### Vantagens
- Compilações **ilimitadas**
- **Rápido** sem latência de rede
- Funciona offline

### Desvantagens
- Transferência inicial de ~10GB
- Usa recursos do PC

---

## Documentos Relacionados

- [Primeiros Passos](./getting-started.md)
- [Resolução de Problemas](./troubleshooting.md)
