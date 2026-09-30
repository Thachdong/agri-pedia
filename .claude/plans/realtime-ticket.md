# Feature: Realtime ticket (socket auth cho browser qua BFF)

Vấn đề: FE Next.js BFF giữ access/refresh token trong httpOnly cookie; browser không đọc được token nhưng socket.io handshake (`SocketIoRealtimeGateway`) cần `auth.token`.

Giải pháp: short-lived, audience-scoped **realtime ticket**.
Flow: browser → BFF `GET /api/realtime/ticket` (cookie) → BFF gọi `POST /auth/realtime-ticket` (Bearer access token)
  → user.IssueRealtimeTicket (user phải ACTIVE; ký ticket { userId }, TTL ngắn, chỉ dùng cho socket)
  → browser `io(url, { auth: (cb) => fetch ticket → cb({ ticket }) })` → gateway verify `auth.ticket` → join `user:<id>`.
Ticket không dùng được làm access token (và ngược lại). No cross-module call, no event.

- [x] 1. [config-group]    `auth`: realtime ticket TTL (seconds, default 30)
- [x] 2. [shared-wrapper]  realtime: IRealtimeTicketService (sign/verify, tách biệt access token) + fake; gateway handshake nhận `auth.ticket`
- [x] 3. [use-case]        user: IssueRealtimeTicket (owner ACTIVE → { ticket, expiresIn })
- [x] 4. [http]            POST /auth/realtime-ticket (AccessTokenGuard)
- [ ] 5. [api-docs]        POST /auth/realtime-ticket
- [ ] 6. [boundary-review]

## Decisions (approved)
1. Handshake vẫn nhận access token (`auth.token` / `Authorization`) cho mobile/native; thêm `auth.ticket`.
2. Ticket stateless (JWT, TTL 30s), không single-use, không lưu DB.
3. Disconnect socket khi logout / user bị khóa: ngoài scope.
