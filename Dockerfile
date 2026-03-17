# 1. بناء واجهة React (Frontend)
FROM node:18 AS build-stage
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# 2. إعداد السيرفر (Backend) وتشغيل الموقع
FROM node:18
WORKDIR /app
COPY backend/package*.json ./backend/
RUN cd backend && npm install
COPY backend/ ./backend/

# نسخ ملفات الواجهة المبنية إلى السيرفر ليقوم بعرضها
COPY --from=build-stage /app/frontend/build ./backend/public

EXPOSE 5000
CMD ["node", "backend/server.js"]