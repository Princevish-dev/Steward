# Steward video recording guide (Hindi)

**Maksimum duration:** 2:50  
**Upload:** Is guide ya recording ko assistant upload nahi karega. Recording aapke PC par local rahegi jab tak aap khud export/upload na karein.  
**Audio:** No music. Clear Hindi/English narration. Browser notifications, personal tabs, email, tokens, API keys aur buyer credentials frame me na aayein.

## Recording se pehle

1. Browser ki **Incognito** window kholen.
2. Ye URL kholen: `https://steward-w7pk.onrender.com/dashboard`
3. Hard refresh karein: `Ctrl+Shift+R`.
4. Browser zoom 90% ya 100% rakhein; recording area me address bar ke alawa personal information na ho.
5. Render banner zaroor dikhayein: **PayPal Sandbox + Channel3 real/fixture search, simulated fulfilment.**
6. PayPal Sandbox buyer credentials ko recording me type karte waqt sirf PayPal page record karein; password ko narration me kabhi na bolen.
7. Agar real purchase/capture record nahi karna ho, PayPal step par already-created order aur approval link tak dikhakar next scene par cut karein. Fake capture ko real na batayein.

## Exact 2:50 script

### 0:00–0:12 — Hook

**Screen:** Dashboard ka top section aur safety banner.

**Bolna:**  
“Steward AI agent ko credit card nahi deta—owner-defined mandate deta hai. AI products propose karta hai, lekin deterministic policy engine hi decide karta hai aur PayPal Sandbox me payment gate karta hai.”

### 0:12–0:32 — Mandate

**Screen actions:**

1. `New mandate` page kholen.
2. Owner email: apna naya unique email/alias daalein, jaise `steward-video-2026@example.com`.
3. Intent likhen: `Buy office paper and coffee, maximum 120 dollars monthly, nothing over 40 dollars per item, ask me above 60 dollars.`
4. Draft parse karayein.
5. Draft ke categories, caps aur `ASK_HUMAN` threshold dikhayein.
6. Confirm karein aur `ACTIVE` state dikhayein.

**Bolna:**  
“Mandate me categories, monthly budget, per-item cap aur approval threshold explicitly save hote hain. Confirm ke baad hi mandate ACTIVE hota hai.”

### 0:32–0:57 — Normal purchase

**Screen actions:**

1. Dashboard par `Demo login — seed working data` click karein, ya active mandate select karein.
2. Scenario: `Within limits (AUTO)`.
3. `Run Steward` click karein.
4. `AUTO APPROVE`, cart total aur 13 policy checks dikhayein.
5. Channel3 label point karein: `real` ho to real, warna `fixture fallback`.
6. `Create PayPal Sandbox Order` click karein.
7. **Approve in PayPal Sandbox** link dikhayein.

**Bolna:**  
“Normal cart me policy ke sabhi 13 rules pass hote hain. Product catalog real ho sakta hai ya clearly labelled fixture fallback. PayPal order tabhi banta hai jab persisted decision payment allow kare.”

### 0:57–1:15 — PayPal approval and fulfilment

**Screen actions:**

1. `Approve in PayPal Sandbox` link kholen.
2. Sandbox buyer se approve karein.
3. Return ke baad Steward dashboard par wapas aayein.
4. `Capture approved payment` click karein, **sirf agar aapne real Sandbox purchase approve karne ka faisla kiya ho**.
5. Tracking label dikhayein: `simulated carrier`.
6. Refund button ko highlight karein; actual refund tabhi karein jab capture real test ke liye kiya ho.

**Bolna:**  
“Buyer approval PayPal ke apne page par hota hai. Return URL public Steward URL par aata hai. Fulfilment aur carrier tracking demo me simulated hain; payment PayPal Sandbox ka hai.”

### 1:15–1:36 — Approval inbox

**Screen actions:**

1. Scenario: `Above ask threshold (ASK_HUMAN)`.
2. `Run Steward` click karein.
3. Approval inbox me failed rule, amount aur expiry dikhayein.
4. Keyboard se approval row par jaakar `Approve` ya `Deny` activate karein.
5. Approval ke baad gated PayPal order/link dikhayein.

**Bolna:**  
“Threshold cross hone par AI payment ko approve nahi kar sakta. Decision ASK_HUMAN hota hai. Buyer/owner approval ke bina PayPal capture nahi hota.”

### 1:36–1:56 — Red-team attacks

**Screen:** `/redteam`.

**Screen actions:**

1. Five hostile fixtures run karein.
2. Har outcome dikhayein:
   - instruction injection → `BLOCK`
   - cap escalation → `BLOCK`
   - price drift → `ASK_HUMAN`
   - deny-listed merchant → `BLOCK`
   - quantity escalation → `BLOCK`
3. Rule evidence aur zero-payment behavior dikhayein.

**Bolna:**  
“Product text untrusted data hai. Injection instructions ko data ki tarah treat kiya jata hai. LLM caution badha sakta hai—AUTO ko ASK ya BLOCK kar sakta hai, lekin safety relax nahi kar sakta.”

### 1:56–2:16 — Ledger proof

**Screen:** Dashboard ka Ledger Grid.

**Screen actions:**

1. `VALID — VERIFIED` dikhayein.
2. `Verify` click karein.
3. Tamper demonstration ko **sirf dedicated demo/test copy** par chalayein.
4. `TAMPERED — INVALID` dikhayein.
5. `Restore` karein aur `VALID — VERIFIED` wapas dikhayein.

**Bolna:**  
“Har state change per-mandate SHA-256 hash chain me append hota hai. Verification stored values ko recompute karta hai. Tamper detect hota hai; real production chain ko permanently modify nahi kiya jata.”

### 2:16–2:31 — MCP

**Screen:** External MCP client ya terminal; key ko mask karein.

**Screen actions:**

1. Four tools ka list dikhayein:
   - `propose_purchase`
   - `get_mandate_status`
   - `list_my_purchases`
   - `request_approval_status`
2. Mandate-scoped key ke saath `get_mandate_status` call dikhayein.
3. `propose_purchase` ka deterministic decision dikhayein.
4. API key ko video me reveal na karein.

**Bolna:**  
“External agent ko sirf mandate-scoped MCP key milti hai. MCP bhi wahi deterministic decision aur approval boundary use karta hai—alag payment bypass nahi.”

### 2:31–2:43 — Dispute Advocate

**Screen:** Dashboard par `Draft dispute evidence` ya labelled simulated dispute action.

**Screen actions:**

1. Dispute draft open karein.
2. `source: fallback` ya AI source dikhayein.
3. Missing facts ke liye `not available` text dikhayein.
4. Clearly labelled `SIMULATED` action ho to wahi label frame me rakhein.

**Bolna:**  
“Dispute Advocate evidence draft karta hai, facts invent nahi karta. Unknown information ke liye ‘not available’ likhta hai. Ye demo dispute flow simulated hai.”

### 2:43–2:50 — Closing

**Screen:** Banner, policy checks aur valid ledger ek saath.

**Bolna:**  
“PayPal Sandbox, Channel3 real ya fixture, simulated fulfilment, aur har state ke liye verifiable proof. Delegation with proof.”

## Recording ke baad checklist

- Duration **3:00 se kam** hai.
- Audio clear hai; music nahi hai.
- Koi API key, session cookie, password, email inbox ya private tab visible nahi hai.
- PayPal ko **Sandbox** hi kaha gaya hai.
- Channel3 ko real/fixture ke hisaab se honestly label kiya gaya hai.
- Tracking, dispute aur tamper demo ko simulated/demo kaha gaya hai.
- Agar capture hua, to uske baad refund/ledger state verify karein.
- File ko local PC par save karein. Upload/publish aap khud decide karein.

## Agar live step fail ho

- PayPal approval fail: error message ke saath scene cut karein; fake success mat dikhayein.
- Channel3 unavailable: `fixture fallback` label dikhayein; real catalog claim mat karein.
- Render slow: page load hone tak recording pause karein; localhost URL kabhi use na karein.
- Ledger invalid: recording rok dein; invalid state ko final proof ke roop me submit na karein.
