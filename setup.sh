#!/bin/bash
set -e

echo -e "\033[0;36mSetting up Antrian BPOM Lubuklinggau...\033[0m"

echo -e "\n\033[0;33m[1/5] Installing dependencies...\033[0m"
npm install

echo -e "\n\033[0;33m[2/5] Creating .env file...\033[0m"
if [ ! -f ".env" ]; then
    cp .env.example .env
    echo ".env created from .env.example"
else
    echo ".env already exists, skipping."
fi

echo -e "\n\033[0;33m[3/5] Running database migrations...\033[0m"
npm run db:migrate

echo -e "\n\033[0;33m[4/5] Seeding initial data...\033[0m"
npm run db:seed

echo -e "\n\033[0;33m[5/5] Configuring port forwarding (80 -> 3000)...\033[0m"
if [ "$EUID" -eq 0 ]; then
    iptables -t nat -A PREROUTING -p tcp --dport 80 -j REDIRECT --to-port 3000
    iptables -t nat -A OUTPUT -p tcp --dport 80 -j REDIRECT --to-port 3000
    echo "Port forwarding configured: port 80 -> 3000"
else
    echo -e "\033[0;33mSkipped (not root). Jalankan ulang dengan sudo untuk setup port 80.\033[0m"
    echo "Atau jalankan manual:"
    echo "  sudo iptables -t nat -A PREROUTING -p tcp --dport 80 -j REDIRECT --to-port 3000"
fi

echo -e "\n\033[0;32mSetup complete! Jalankan: npm start\033[0m"
HOSTNAME_VAL=$(hostname)
echo -e "\nAkses aplikasi:"
echo -e "  http://$HOSTNAME_VAL/          <- Kiosk"
echo -e "  http://$HOSTNAME_VAL/display   <- Display TV"
echo -e "  http://$HOSTNAME_VAL/dashboard <- Petugas"
echo -e "\n\033[0;36mAdmin: admin / admin123\033[0m"
echo -e "\033[0;36mStaff: petugas1 / petugas123\033[0m"
