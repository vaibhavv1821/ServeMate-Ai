# 08 - Booking System & Availability Workflow

**STATUS: PLANNED** (Future Phase Feature)

---

## 1. Planned Booking State Machine
```
[CREATED] ---> [ACCEPTED by Provider] ---> [IN_PROGRESS via OTP Verification] ---> [COMPLETED via Proof Upload]
    |                  |
    v                  v
[CANCELLED]       [DECLINED]
```

### Planned Features
- Availability calendar checking.
- OTP code generated for customer upon provider arrival.
- Service execution unlock only when correct OTP is verified by provider app.
