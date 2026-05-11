#!/bin/bash
set -e

echo -e "\033[0;36mSetting up Antrian BPOM Lubuklinggau...\033[0m"

echo -e "\n\033[0;33m[1/4] Installing dependencies...\033[0m"
npm install

echo -e "\n\033[0;33m[2/4] Creating .env file...\033[0m"
if [ ! -f ".env" ]; then
    cp .env.example .env
    echo ".env created from .env.example"
else
    echo ".env already exists, skipping."
fi

echo -e "\n\033[0;33m[3/4] Running database migrations...\033[0m"
npm run db:migrate

echo -e "\n\033[0;33m[4/4] Seeding initial data...\033[0m"
npm run db:seed

echo -e "\n\033[0;32mSetup complete! Run: npm run dev\033[0m"
echo -e "\033[0;36mAdmin: admin / admin123\033[0m"
echo -e "\033[0;36mStaff: petugas1 / petugas123\033[0m"
