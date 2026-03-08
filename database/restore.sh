#!/bin/bash
# =====================================================
# MAT TRACKER PRO - RESTORE SKRIPT
# =====================================================
# Obnovi celotno bazo iz backupa (struktura + podatki + uporabniki).
#
# Uporaba:
#   ./database/restore.sh database/backups/mat_tracker_backup_20260308_120000.sql.gz
#
# Kaj naredi:
#   1. Izbrise obstojecih mat_tracker tabel (ce obstajajo)
#   2. Uvozi celotno strukturo in podatke
#   3. Uvozi uporabnike (auth.users)
#   4. Uvozi storage metapodatke
#
# OPOZORILO: To IZBRISE vse obstoece podatke v mat_tracker shemi!
# =====================================================

set -euo pipefail

# Konfiguracija
SERVER="148.230.109.77"
SSH_KEY="/home/ristov/.ssh/id_ed25519"
DB_CONTAINER="supabase-db"
DB_USER="postgres"
DB_NAME="postgres"

# Preveri argumente
if [ $# -eq 0 ]; then
  echo "Uporaba: $0 <backup-datoteka.sql.gz>"
  echo ""
  echo "Razpolozljivi backupi:"
  ls -la database/backups/*.sql.gz 2>/dev/null || echo "  Ni backupov v database/backups/"
  exit 1
fi

BACKUP_FILE="$1"

# Preveri ali datoteka obstaja
if [ ! -f "$BACKUP_FILE" ]; then
  echo "NAPAKA: Datoteka '$BACKUP_FILE' ne obstaja!"
  exit 1
fi

echo "============================================"
echo "Mat Tracker Pro - RESTORE"
echo "============================================"
echo "Streznik: $SERVER"
echo "Backup:   $BACKUP_FILE"
echo "Datum:    $(date '+%Y-%m-%d %H:%M:%S')"
echo ""
echo "!!! OPOZORILO !!!"
echo "To bo IZBRISALO vse obstoece podatke v mat_tracker shemi"
echo "in jih zamenjalo s podatki iz backupa."
echo ""
read -p "Ali si prepricam? (da/ne): " CONFIRM

if [ "$CONFIRM" != "da" ]; then
  echo "Preklicano."
  exit 0
fi

echo ""

# Dekompresiraj ce je .gz
if [[ "$BACKUP_FILE" == *.gz ]]; then
  echo "Dekompresiranje..."
  TEMP_FILE=$(mktemp /tmp/mat_tracker_restore_XXXXXX.sql)
  gunzip -c "$BACKUP_FILE" > "$TEMP_FILE"
else
  TEMP_FILE="$BACKUP_FILE"
fi

# Kopiraj na streznik
echo "[1/3] Kopiranje backupa na streznik..."
scp -i "$SSH_KEY" "$TEMP_FILE" root@"$SERVER":/tmp/mat_tracker_restore.sql

# Zazeni restore v DB containerju
echo "[2/3] Uvazanje v bazo..."
ssh -i "$SSH_KEY" root@"$SERVER" \
  "docker cp /tmp/mat_tracker_restore.sql $DB_CONTAINER:/tmp/mat_tracker_restore.sql && \
   docker exec $DB_CONTAINER psql -U $DB_USER -d $DB_NAME -f /tmp/mat_tracker_restore.sql"

# Pocisti
echo "[3/3] Ciscenje..."
ssh -i "$SSH_KEY" root@"$SERVER" \
  "docker exec $DB_CONTAINER rm -f /tmp/mat_tracker_restore.sql && \
   rm -f /tmp/mat_tracker_restore.sql"

# Pocisti lokalni temp fajl
if [[ "$BACKUP_FILE" == *.gz ]]; then
  rm -f "$TEMP_FILE"
fi

echo ""
echo "============================================"
echo "Restore USPESNO ZAKLJUCEN!"
echo "============================================"
echo "Baza je bila obnovljena iz: $BACKUP_FILE"
echo ""
echo "Preveri ali vse deluje:"
echo "  - Odpri aplikacijo in se prijavi"
echo "  - Preveri ali so vsi podatki prisotni"
echo ""
