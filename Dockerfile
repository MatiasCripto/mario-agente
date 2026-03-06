FROM node:22-alpine

# Hugging Face Spaces requiere ejecutarse como un usuario no-root con ID 1000
RUN adduser -D -u 1000 user
USER user
ENV PATH="/home/user/.local/bin:$PATH"

WORKDIR /app

# Archivos de dependencias con permisos para el usuario
COPY --chown=user package*.json ./
RUN npm install

# Copiamos todo el código con permisos del usuario nuevo
COPY --chown=user . .

# Puerto mandatorio por Hugging Face
EXPOSE 7860

CMD ["npm", "run", "dev"]
