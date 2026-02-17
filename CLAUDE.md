# Mat Tracker Pro - Navodila za Claude

## Deploy na strežnik

### Avtomatski deploy (priporočeno)
Push na `main` branch sproži CI → Deploy workflow, ki:
1. Zgradi Docker image v GitHub Actions (z brotli modulom + pre-kompresijo)
2. Pushne image v GHCR (`ghcr.io/dzo4e2250/mat-tracker-pro`)
3. Na serverju pullne nov image, zažene z zero-downtime swapom

### Ročni deploy
```bash
# 1. Kopiraj CELOTEN projekt (brez node_modules) na strežnik
rsync -avz --exclude 'node_modules' --exclude '.git' -e "ssh -i /home/ristov/.ssh/id_ed25519" /home/ristov/Applications/07-Web-Apps/mat-tracker-pro/ root@148.230.109.77:/root/mat-tracker-pro/

# 2. Build in zaženi container - POMEMBNO: uporabi --network npm_npm_network
ssh -i /home/ristov/.ssh/id_ed25519 root@148.230.109.77 "cd /root/mat-tracker-pro && docker build -t mat-tracker-pro . && docker stop mat-tracker-pro && docker rm mat-tracker-pro && docker run -d --name mat-tracker-pro --restart unless-stopped --network npm_npm_network --log-driver json-file --log-opt max-size=10m --log-opt max-file=3 -p 3000:80 mat-tracker-pro"
```

## Strežnik info
- IP: 148.230.109.77
- SSH ključ: /home/ristov/.ssh/id_ed25519
- Domena: matpro.reitti.cloud
- NPM (Nginx Proxy Manager) upravlja SSL in routing

## Pomembno
- Container MORA biti na `npm_npm_network` omrežju, sicer NPM ne more doseči containerja in vrne 502 Bad Gateway
- Ime containerja mora biti `mat-tracker-pro` (tako je nastavljeno v NPM konfiguraciji)
