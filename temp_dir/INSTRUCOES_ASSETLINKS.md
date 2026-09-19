# Configuração do Digital Asset Links (assetlinks.json)

O arquivo `public/.well-known/assetlinks.json` foi criado com o fingerprint da sua **Chave de Upload** local.

Para que a barra de endereço desapareça no aplicativo instalado pela Google Play Store, você **PRECISA** adicionar o fingerprint da chave de assinatura do Google (App Signing Key).

## Como obter o fingerprint da Google Play:

1.  Acesse o [Google Play Console](https://play.google.com/console).
2.  Selecione o app **Jacaré do Corte**.
3.  No menu lateral esquerdo, vá em **Configuração** -> **Assinatura de apps (App integrity)**.
4.  Na aba **Assinatura de apps**, procure pelo certificado "Chave de assinatura do app" (App signing key certificate).
5.  Copie o valor do **Impressão digital do certificado SHA-256**.
6.  Abra o arquivo `public/.well-known/assetlinks.json`.
7.  Adicione o valor copiado ao array de fingerprints. Exemplo:

```json
"sha256_cert_fingerprints": [
  "5D:37:8F:E9:9C:1A:59:9B:55:E1:59:FD:60:E6:31:B6:DA:04:D7:95:FC:24:8F:BB:8C:6A:BF:9A:AA:C0:64:62",
  "COLE_AQU_O_FINGERPRINT_DA_GOOGLE_PLAY"
]
```

## Próximos Passos

1.  Faça o commit e push dessas alterações para o GitHub.
2.  Aguarde o deploy na Vercel.
3.  Verifique se o arquivo está acessível em: `https://jacare-do-corte-lk9q.vercel.app/.well-known/assetlinks.json`
4.  Após o deploy, o Google vai verificar o arquivo periodicamente. Pode levar algum tempo para a barra sumir nos dispositivos já instalados (limpar dados do app pode forçar a verificação).
