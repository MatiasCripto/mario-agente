FROM node:20-slim

# Hugging Face requiere un usuario con UID 1000
RUN useradd -m -u 1000 user
USER user
ENV HOME=/home/user \
    PATH=/home/user/.local/bin:$PATH

WORKDIR $HOME/app

# Copiamos todo garantizando que el usuario 1000 sea el dueño
COPY --chown=user . $HOME/app

# Instalamos todo (incluyendo tsx que ahora está en dependencies)
RUN npm install

# Puerto obligatorio para Hugging Face
EXPOSE 7860
ENV PORT=7860

CMD ["npm", "run", "dev"]
