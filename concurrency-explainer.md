# Concurrency Explainer

**Your name:** Moureesh
**Date:** 2026-04-25

---

## The Root Cause — Why Check-Then-Insert Fails

<!-- 
  Explain what a race condition is in the context of this endpoint.
  Why does checking with findFirst() before creating with create() fail 
  when two requests arrive at the same millisecond?
  What is the "gap" between the check and the insert?
  
  Minimum: 2 paragraphs
-->

The race condition happens because the old code separated the decision into two steps: first it checked whether a booking already existed, then it inserted a new row. That looks safe in a single request, but it is not atomic. When two requests arrive at nearly the same time, both can run the check before either one writes the row. Each request sees an empty result set, each assumes the seat is still available, and both proceed to insert. The gap between the read and the write is the bug.

This is why check-then-insert fails under concurrency even when the application seems fast. The problem is not just speed; it is that two independent requests can interleave in a way the application cannot control. Once both requests pass the check, the database is no longer protecting the seat assignment, so the second insert becomes a duplicate booking instead of a rejected conflict.

---

## Why the Unique Constraint Fixes It

<!--
  Explain why moving the check from application code (findFirst) to the
  database level (@@unique constraint) actually closes the race condition.
  
  Why can't application-layer checking solve this, no matter how fast it runs?
  What does the database do differently that makes it atomic?
  
  Minimum: 1 paragraph
-->

The unique constraint fixes the problem because it moves the rule into the database itself. With @@unique([seatId, showId]), the database guarantees that only one row can exist for a given seat and show combination. That makes the write operation atomic from the application’s point of view: even if two requests race, the database accepts the first insert and rejects the second one.

Application-level checks cannot fully solve this, no matter how carefully they are written, because they always happen before the insert and therefore always leave a race window. The database is the only place that can enforce the rule at the exact moment the row is written.

---

## Why Rate Limiting Alone Is Not Enough

<!--
  Explain why adding express-rate-limit without the @@unique constraint
  would still allow double bookings.
  
  Give a concrete scenario: two users, one request each, both within the limit.
  What happens without the constraint?
  
  Minimum: 1 paragraph
-->

Rate limiting helps protect the endpoint from abuse, but it does not prevent double booking by itself. Two different users can each send one request within the limit and still target the same seat at the same time. Both requests would be allowed through, and without the unique constraint, both could succeed. So the limiter reduces traffic pressure, but it does not guarantee correctness.

---

## What P2002 Means and Why 409

<!--
  What does Prisma error code P2002 mean?
  Why is 409 Conflict the correct HTTP status to return when it fires?
  Why not 400 Bad Request? Why not 500 Internal Server Error?
  
  Minimum: 1 paragraph
-->

Prisma error code P2002 means a unique constraint violation. In this case, it tells us the booking insert tried to reuse a seat and show combination that already exists. That is not a server failure; it is a business rule conflict, so the right HTTP response is 409 Conflict.

Returning 409 is better than 500 because the server did its job correctly and the request simply could not be applied. It is also better than 400 because the payload may still be structurally valid; the problem is the current state of the database, not malformed input. Mapping P2002 to 409 gives clients a precise and predictable response they can handle cleanly.

---

**Total word count:** approximately 370 words across all four sections
