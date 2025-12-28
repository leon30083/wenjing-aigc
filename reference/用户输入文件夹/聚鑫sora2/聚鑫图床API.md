# 上传图片到图床

## OpenAPI Specification

```yaml
openapi: 3.0.1
info:
  title: ''
  description: ''
  version: 1.0.0
paths:
  /api/upload:
    post:
      summary: 上传图片到图床
      deprecated: false
      description: ''
      tags:
        - 默认模块/帮助中心
      parameters: []
      requestBody:
        content:
          multipart/form-data:
            schema:
              type: object
              properties:
                file:
                  format: binary
                  type: string
                  example: >-
                    file://C:\Users\Administrator\Desktop\d63ea1bd9011777e653b1addc7a88433.png
            examples: {}
      responses:
        '200':
          description: ''
          content:
            application/json:
              schema:
                type: object
                properties: {}
                x-apifox-orders: []
          headers: {}
          x-apifox-name: 成功
      security:
        - bearer: []
      x-apifox-folder: 默认模块/帮助中心
      x-apifox-status: developing
      x-run-in-apifox: https://app.apifox.com/web/project/7016580/apis/api-358967596-run
components:
  schemas: {}
  securitySchemes:
    bearer:
      type: http
      scheme: bearer
servers:
  - url: https://api.jxincm.cn
    description: 正式环境
security:
  - bearer: []

```
