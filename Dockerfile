FROM node:20-slim

# En las imágenes de Node, el usuario 'node' ya tiene el UID 1000 (que requiere HF)
# Así que en lugar de intentar crearlo, simplemente lo usamos.
USER node
ENV HOME=/home/node \
    PATH=/home/node/.local/bin:$PATH

WORKDIR $HOME/app

# Copiamos todo garantizando que el usuario 'node' sea el dueño
COPY --chown=node:node . $HOME/app

# Instalamos todo (incluyendo tsx que está en dependencies)
RUN npm install

# Puerto obligatorio para Hugging Face
EXPOSE 7860
ENV PORT=7860

CMD ["npm", "run", "dev"]
