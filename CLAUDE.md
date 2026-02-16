# Mat Tracker Pro - Navodila za Claude

## Deploy na strežnik

```bash
# 1. Kopiraj CELOTEN projekt (brez node_modules) na strežnik
rsync -avz --exclude 'node_modules' --exclude '.git' -e "ssh -i /home/ristov/.ssh/id_ed25519" /home/ristov/Applications/07-Web-Apps/mat-tracker-pro/ root@148.230.109.77:/root/mat-tracker-pro/

# 2. Build in zaženi container - POMEMBNO: uporabi --network npm_npm_network
ssh -i /home/ristov/.ssh/id_ed25519 root@148.230.109.77 "cd /root/mat-tracker-pro && docker build -t mat-tracker-pro . && docker stop mat-tracker-pro && docker rm mat-tracker-pro && docker run -d --name mat-tracker-pro --network npm_npm_network -p 3000:80 mat-tracker-pro"
```

### Zakaj kopiramo celoten projekt?
Dockerfile izvaja `npm run build` na strežniku iz source kode. Če kopiramo samo dist/, se uporabi stara source koda na strežniku.

## Strežnik info
- IP: 148.230.109.77
- SSH ključ: /home/ristov/.ssh/id_ed25519
- Domena: matpro.reitti.cloud
- NPM (Nginx Proxy Manager) upravlja SSL in routing

## Pomembno
- Container MORA biti na `npm_npm_network` omrežju, sicer NPM ne more doseči containerja in vrne 502 Bad Gateway
- Ime containerja mora biti `mat-tracker-pro` (tako je nastavljeno v NPM konfiguraciji)
