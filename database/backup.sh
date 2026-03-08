#!/bin/bash
# =====================================================
# MAT TRACKER PRO - BACKUP SKRIPT
# =====================================================
# Naredi kompletni backup celotne baze (struktura + podatki).
# Backup vkljucuje:
#   - mat_tracker shema (vse tabele z vsemi podatki)
#   - auth.users (uporabniski racuni in gesla)
#   - storage.objects + storage.buckets (avatarji metapodatki)
#
# Uporaba:
#   ./database/backup.sh
#   ./database/backup.sh /pot/do/backup-mape
#
# Predpogoji:
#   - SSH dostop do streznika (148.230.109.77)
#   - pg_dump dostopen v Supabase DB containerju
# =====================================================

set -euo pipefail

# Konfiguracija
SERVER="148.230.109.77"
SSH_KEY="/home/ristov/.ssh/id_ed25519"
DB_CONTAINER="supabase-db"          # Ime Supabase PostgreSQL containerja
DB_USER="postgres"
DB_NAME="postgres"

# Backup lokacija
BACKUP_DIR="${1:-/home/ristov/Applications/07-Web-Apps/mat-tracker-pro/database/backups}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="mat_tracker_backup_${TIMESTAMP}.sql"
BACKUP_PATH="${BACKUP_DIR}/${BACKUP_FILE}"

# Ustvari backup mapo ce ne obstaja
mkdir -p "$BACKUP_DIR"

echo "============================================"
echo "Mat Tracker Pro - Backup"
echo "============================================"
echo "Streznik: $SERVER"
echo "Datum:    $(date '+%Y-%m-%d %H:%M:%S')"
echo "Datoteka: $BACKUP_PATH"
echo ""

# 1. Backup mat_tracker sheme (struktura + podatki)
echo "[1/3] Backup mat_tracker sheme (vse tabele + podatki)..."
ssh -i "$SSH_KEY" root@"$SERVER" \
  "docker exec $DB_CONTAINER pg_dump -U $DB_USER -d $DB_NAME \
    --schema=mat_tracker \
    --no-owner \
    --no-privileges \
    --clean \
    --if-exists" > "$BACKUP_PATH"

# 2. Backup auth.users (uporabniki z gesli)
echo "[2/3] Backup auth.users (uporabniski racuni)..."
ssh -i "$SSH_KEY" root@"$SERVER" \
  "docker exec $DB_CONTAINER pg_dump -U $DB_USER -d $DB_NAME \
    --table=auth.users \
    --data-only \
    --no-owner \
    --no-privileges \
    --column-inserts" >> "$BACKUP_PATH"

# 3. Backup storage metapodatkov (avatarji, podpisi)
echo "[3/3] Backup storage buckets in objektov..."
ssh -i "$SSH_KEY" root@"$SERVER" \
  "docker exec $DB_CONTAINER pg_dump -U $DB_USER -d $DB_NAME \
    --table=storage.buckets \
    --table=storage.objects \
    --data-only \
    --no-owner \
    --no-privileges \
    --column-inserts" >> "$BACKUP_PATH" 2>/dev/null || echo "  (storage tabele preskoocene - morda ne obstajajo)"

# Kompresija
echo ""
echo "Kompresiranje..."
gzip -f "$BACKUP_PATH"
BACKUP_PATH="${BACKUP_PATH}.gz"

# Velikost
SIZE=$(du -h "$BACKUP_PATH" | cut -f1)

echo ""
echo "============================================"
echo "Backup USPESNO ZAKLJUCEN!"
echo "============================================"
echo "Datoteka: $BACKUP_PATH"
echo "Velikost: $SIZE"
echo ""
echo "Za obnovo zazeni:"
echo "  ./database/restore.sh $BACKUP_PATH"
echo ""
