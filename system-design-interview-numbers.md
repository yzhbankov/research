# The System Design Interview Numbers Cheat Sheet: Every Technology and Its Figure of Merit

> *"What's your estimated QPS?" — the question that separates a candidate who has operated systems from one who has only read about them.*

Every system design interview eventually reaches the same moment. You have drawn boxes and arrows, you have named your technologies, and then the interviewer leans in and asks: **"How many of those do you need?"**

At that point, hand-waving stops working. You need numbers — not memorized trivia, but a working set of **figures of merit**: the one or two quantities that characterize what a technology can actually do. How many requests can one application server absorb? How fast is a Redis read, really? At how many rows does PostgreSQL start hurting? How many partitions can a Kafka broker hold? How many shards should an Elasticsearch index have?

This article is the reference I wish I had. It collects the figures of merit for essentially every technology class that shows up in a system design interview — compute, load balancing, caching, relational databases, NoSQL stores, search, streaming, object storage, analytics, coordination, observability, vector search, serverless, orchestration — together with the back-of-the-envelope math that turns them into an architecture.

A word on precision before we start. **These are order-of-magnitude numbers.** Your hardware, your payload sizes, your access patterns and your tuning will move any of them by 2–5×. That is fine. Interviews reward *calibration*, not precision: knowing that a Redis GET is ~0.2 ms and not 20 ms, that a Postgres node does ~10k writes/sec and not 10M, that a Kafka broker holds ~4,000 partitions and not 4 million. Being right to within an order of magnitude, and being explicit that you are estimating, is exactly the behavior a strong interviewer is looking for.

---

## Table of Contents

1. [Why numbers win interviews](#1-why-numbers-win-interviews)
2. [The latency ladder every engineer should know](#2-the-latency-ladder-every-engineer-should-know)
3. [The back-of-the-envelope toolkit](#3-the-back-of-the-envelope-toolkit)
4. [Network, geography and protocol latency](#4-network-geography-and-protocol-latency)
5. [Application servers: requests per second per box](#5-application-servers-requests-per-second-per-box)
6. [Load balancers, proxies and API gateways](#6-load-balancers-proxies-and-api-gateways)
7. [Caching: Redis, Memcached and friends](#7-caching-redis-memcached-and-friends)
8. [Relational databases: PostgreSQL and MySQL](#8-relational-databases-postgresql-and-mysql)
9. [When to shard: the thresholds table](#9-when-to-shard-the-thresholds-table)
10. [NoSQL: DynamoDB, Cassandra, ScyllaDB, MongoDB, HBase](#10-nosql-dynamodb-cassandra-scylladb-mongodb-hbase)
11. [Search engines: Elasticsearch and OpenSearch](#11-search-engines-elasticsearch-and-opensearch)
12. [Streaming and messaging: Kafka, Pulsar, RabbitMQ, Kinesis, SQS, NATS](#12-streaming-and-messaging)
13. [Stream processing: Flink, Spark, Kafka Streams](#13-stream-processing-flink-spark-kafka-streams)
14. [Object storage and CDN](#14-object-storage-and-cdn)
15. [OLAP and warehouses: ClickHouse, Druid, Pinot, BigQuery, Snowflake](#15-olap-and-warehouses)
16. [Time series and observability: Prometheus, VictoriaMetrics, InfluxDB](#16-time-series-and-observability)
17. [Vector databases and ANN search](#17-vector-databases-and-ann-search)
18. [Graph databases](#18-graph-databases)
19. [Coordination: ZooKeeper, etcd, Consul, Raft](#19-coordination-zookeeper-etcd-consul-raft)
20. [Storage hardware: HDD, SSD, NVMe, EBS](#20-storage-hardware)
21. [Serverless and edge](#21-serverless-and-edge)
22. [Kubernetes and orchestration limits](#22-kubernetes-and-orchestration-limits)
23. [Serialization, compression and protocol overhead](#23-serialization-compression-and-protocol-overhead)
24. [Probabilistic data structures](#24-probabilistic-data-structures)
25. [Availability, reliability and error budgets](#25-availability-reliability-and-error-budgets)
26. [Cost figures of merit](#26-cost-figures-of-merit)
27. [Six worked capacity estimates](#27-six-worked-capacity-estimates)
28. [The one-page cheat sheet](#28-the-one-page-cheat-sheet)

---

## 1. Why numbers win interviews

A system design interview measures four things: structured problem solving, breadth of technology knowledge, depth in at least one area, and **quantitative judgment**. The last one is where most candidates lose points, and it is the easiest to fix.

Numbers do three jobs in an interview:

**They size the system.** "10 million daily active users, 20 actions each, so 200M requests/day, which is ~2,300 requests/sec average and maybe 7,000 at peak" instantly tells the interviewer whether you need one box or a fleet. Without it, every later decision is arbitrary.

**They justify choices.** "I'll shard the orders table" is an opinion. "Each order row is ~500 bytes, we write 50M/day, that's 25 GB/day and 9 TB/year — well past what one PostgreSQL primary handles comfortably, so I'll shard by customer_id" is an argument.

**They expose bottlenecks.** Capacity numbers are how you find the single component that will fail first. If your design needs 500,000 writes/sec into one relational primary, the number tells you before the interviewer does.

The failure modes to avoid are equally clear: inventing suspiciously precise figures ("this handles 47,300 QPS"), quoting benchmark numbers as production numbers (a "1M ops/sec" benchmark is a pipelined, single-key, no-network number), and forgetting the **peak-to-average ratio** — real traffic peaks at 2–10× the daily average, and you provision for peak.

> **Interview technique:** say the number, say the assumption, say the tolerance. *"I'll assume ~1 KB per message — if it's 10 KB, storage goes up 10× but the QPS math is unchanged."* This single habit reads as seniority.

---

## 2. The latency ladder every engineer should know

This is the foundation. Jeff Dean's "Latency Numbers Every Programmer Should Know" is still the single most valuable table in system design, modernized here for NVMe, current CPUs and cloud networks.

| Operation | Latency | Relative to L1 |
|---|---|---|
| L1 cache reference | 0.5–1 ns | 1× |
| Branch mispredict | 3–5 ns | ~5× |
| L2 cache reference | 4–7 ns | ~10× |
| Atomic increment / uncontended mutex lock-unlock | 15–25 ns | ~25× |
| L3 cache reference | 20–40 ns | ~40× |
| Main memory (DRAM) reference | 80–120 ns | ~100× |
| Syscall (light, e.g. `getpid` with vDSO bypassed) | 50–500 ns | ~500× |
| Context switch (thread) | 1–3 µs | ~2,000× |
| Compress 1 KB with Snappy / LZ4 | 1–3 µs | ~2,000× |
| Send 1 KB over 10 Gbps network (serialization only) | ~1 µs | ~1,000× |
| Read 1 MB sequentially from RAM | 40–100 µs (10–25 GB/s per core) | ~50,000× |
| NVMe SSD random 4 KB read | 20–100 µs | ~50,000× |
| SATA SSD random 4 KB read | 100–200 µs | ~150,000× |
| Round trip within the same rack | 100–250 µs | ~200,000× |
| Round trip within the same AZ / datacenter | 0.25–0.5 ms | ~500,000× |
| Read 1 MB sequentially from NVMe (3–7 GB/s) | 150–350 µs | ~250,000× |
| Read 1 MB sequentially from SATA SSD (500 MB/s) | ~2 ms | ~2,000,000× |
| Round trip across AZs in one region | 0.5–2 ms | ~1,000,000× |
| Network-attached block storage (EBS) read | 0.5–2 ms | ~1,000,000× |
| HDD seek | 4–10 ms | ~8,000,000× |
| Read 1 MB sequentially from HDD (150 MB/s) | 6–10 ms | ~8,000,000× |
| Cross-region round trip (US-East → US-West) | 60–80 ms | ~70,000,000× |
| Cross-continent round trip (US → Europe) | 75–100 ms | ~90,000,000× |
| Intercontinental round trip (US → Asia / Australia) | 120–250 ms | ~200,000,000× |

**The five ratios to memorize:**

- Memory is ~**100×** faster than NVMe SSD, which is ~**100×** faster than an HDD seek.
- A same-datacenter round trip (~0.5 ms) costs as much as **5,000 memory reads**.
- A cross-continent round trip (~100 ms) costs as much as **200 same-DC round trips**.
- **Disk is not the enemy any more; the network and the speed of light are.**
- Anything a human perceives as instant is **~100 ms**; anything over **1 s** feels slow; over **10 s** they leave.

### Human perception budgets

| Target | Budget | Implication |
|---|---|---|
| Feels instantaneous | < 100 ms | Everything must be in-memory / edge-cached |
| Keeps flow of thought | < 1 s | One or two DB round trips + render |
| Keeps attention | < 10 s | Needs a progress indicator |
| API p99 SLO (typical internal) | 100–300 ms | Budget across 3–5 hops |
| API p99 SLO (typical public) | 200 ms–1 s | Includes TLS + internet RTT |
| Search-as-you-type | < 100 ms | Prefix index in memory |
| Video start (join time) | < 2 s | CDN + adaptive bitrate |

---

## 3. The back-of-the-envelope toolkit

### Time and scale constants

| Constant | Value | Use |
|---|---|---|
| Seconds per day | 86,400 (~10⁵) | Convert daily volume → QPS |
| Seconds per month | 2.6M | Monthly billing/storage math |
| Seconds per year | 31.5M (π × 10⁷) | Annual storage growth |
| 1 M/day | ≈ **12 requests/sec** | The most useful conversion |
| 1 B/day | ≈ **11,600 requests/sec** | Web-scale conversion |
| Peak-to-average ratio | 2–10× (use **3×** by default) | Provisioning |
| Read:write ratio, consumer apps | 10:1 to 1000:1 | Justifies caches and replicas |

**The one conversion to never forget:** *X million requests per day ÷ 100,000 ≈ X × 10 requests/second.* (86,400 ≈ 10⁵ makes the mental arithmetic trivial.)

### Powers of two and data sizes

| Power | Approx | Name | Bytes |
|---|---|---|---|
| 2¹⁰ | 1 thousand | Kilobyte | 1 KB |
| 2²⁰ | 1 million | Megabyte | 1 MB |
| 2³⁰ | 1 billion | Gigabyte | 1 GB |
| 2⁴⁰ | 1 trillion | Terabyte | 1 TB |
| 2⁵⁰ | 1 quadrillion | Petabyte | 1 PB |

| Data item | Typical size |
|---|---|
| `char` / ASCII byte | 1 B |
| `int32` / `float32` | 4 B |
| `int64` / `double` / timestamp | 8 B |
| UUID (binary / string) | 16 B / 36 B |
| Row overhead (Postgres tuple header) | ~24–28 B |
| Typical DB row (a few columns) | 100–500 B |
| Tweet / short post (text + metadata) | 300 B – 1 KB |
| JSON API response (small) | 1–10 KB |
| Web page HTML | 50–100 KB |
| Thumbnail image | 5–50 KB |
| Photo (JPEG, phone) | 200 KB – 5 MB |
| Minute of 1080p video (5 Mbps) | ~37 MB |
| Minute of 4K video (20 Mbps) | ~150 MB |
| Embedding vector (768 dims, fp32) | ~3 KB |

### The three laws you can apply out loud

**Little's Law — `L = λ × W`** (concurrency = throughput × latency). This sizes thread pools, connection pools and queue depths.
*Example:* 2,000 rps at 50 ms average latency ⇒ 100 requests in flight ⇒ you need ~100 worker threads or ~100 DB connections' worth of concurrency (before adding headroom).

**Queueing (M/M/1) — `W = S / (1 − ρ)`.** At 50% utilization latency is 2× service time; at 80% it is 5×; at 90% it is 10×; at 95% it is 20×.
*Practical rule:* **plan for 60–70% steady-state CPU utilization.** Above ~80% your p99 becomes unpredictable. This is *the* reason "just add more traffic to the existing box" fails.

**Amdahl / Universal Scalability Law.** Speedup is capped by the serial fraction, and *worsens* with coherency cost. A system with 5% serial work caps at 20× no matter how many machines you add — the practical justification for sharding (no coordination) over a single coordinated cluster.

### Storage estimation recipe

```
daily_bytes   = writes_per_day × bytes_per_record
yearly_bytes  = daily_bytes × 365
provisioned   = yearly_bytes × replication_factor × (1 + index_overhead) × (1 / compression) × years_retained / 0.7
```

Use **replication factor 3**, **index overhead 20–100%** for relational/search, **compression 3–10×** for columnar/log data, and divide by **0.7** because you never run a disk past 70% full.

### Bandwidth estimation recipe

```
bandwidth = qps × avg_response_bytes × 8   (bits/sec)
```
*Example:* 10,000 rps × 50 KB responses = 500 MB/s = **4 Gbps** — already more than a single 1 Gbps NIC and a strong argument for a CDN.

---
## 4. Network, geography and protocol latency

Physics sets the floor. Light travels at ~300,000 km/s in vacuum and roughly **200,000 km/s in fiber**, and real routes are 1.5–2× longer than the great-circle distance.

> **The rule:** ~**5 µs per km one way**, ~**10 µs per km round trip** → **1 ms of RTT per 100 km of fiber**, before any router, firewall or middlebox.

| Path | Distance | Theoretical RTT | Real-world RTT |
|---|---|---|---|
| Same rack | — | — | 0.1–0.25 ms |
| Same availability zone | < 5 km | ~0.05 ms | 0.25–0.5 ms |
| Cross-AZ, same region | 10–100 km | 0.1–1 ms | **0.5–2 ms** |
| US-East ↔ US-West | ~4,000 km | ~40 ms | **60–80 ms** |
| US-East ↔ Europe (N. Virginia ↔ Frankfurt) | ~6,600 km | ~66 ms | **80–95 ms** |
| Europe ↔ Asia (Frankfurt ↔ Singapore) | ~10,000 km | ~100 ms | **150–180 ms** |
| US-West ↔ Asia (Oregon ↔ Tokyo) | ~8,000 km | ~80 ms | **100–130 ms** |
| US ↔ Australia | ~16,000 km | ~160 ms | **180–220 ms** |
| Mobile 4G LTE first hop | — | — | **30–80 ms** |
| Mobile 5G first hop | — | — | **10–30 ms** |
| Home broadband first hop | — | — | **5–20 ms** |
| Satellite (LEO, Starlink) | — | — | **25–60 ms** |
| Satellite (geostationary) | 35,786 km × 2 | — | **500–650 ms** |

### Protocol handshake costs (in RTTs — multiply by the RTT above)

| Step | Cost | Notes |
|---|---|---|
| DNS lookup (uncached) | 1–3 RTT, **20–120 ms** | Cached at OS/browser for the TTL (typ. 30–300 s) |
| TCP handshake | **1 RTT** | SYN, SYN-ACK, ACK |
| TLS 1.2 handshake | **2 RTT** | On top of TCP |
| TLS 1.3 handshake | **1 RTT** | Default in modern stacks |
| TLS 1.3 session resumption (0-RTT) | **0 RTT** | Replay-unsafe for non-idempotent requests |
| QUIC / HTTP/3 first connect | **1 RTT** (0-RTT resumed) | TCP+TLS combined |
| Total cold HTTPS request (80 ms RTT) | **~300–400 ms** | DNS + TCP + TLS + request |
| Warm HTTPS request on a keep-alive connection | **1 RTT + service time** | Why connection pooling matters so much |

**Interview-grade consequences:**
- A cold mobile HTTPS request costs ~0.5 s before your server does any work. Keep-alive, HTTP/2 multiplexing and TLS session resumption are the fixes.
- **Never make a synchronous cross-region call in a user-facing path.** One US↔EU round trip (~90 ms) blows most p99 budgets on its own.
- N+1 query patterns are lethal at scale: 100 sequential queries at 0.5 ms intra-DC RTT = 50 ms of pure network time.
- Cross-AZ calls are ~1 ms and **cost money** (see §26); cross-AZ *chattiness* is a common real-world cost bug.

### Throughput per host

| Link | Throughput | 1 GB transfer takes |
|---|---|---|
| 1 Gbps | 125 MB/s | 8 s |
| 10 Gbps (typical cloud VM) | 1.25 GB/s | 0.8 s |
| 25 Gbps | 3.1 GB/s | 0.3 s |
| 100 Gbps (large instances) | 12.5 GB/s | 0.08 s |
| Single TCP stream, cross-region | 20–100 MB/s (window/RTT limited) | — |

*Bandwidth-delay product:* a single TCP stream is capped at `window / RTT`. With a 64 KB window and 80 ms RTT that is **~800 KB/s**. Bulk cross-region transfer needs parallel streams (or a bigger window) — this is why S3 clients use 8–32 parallel parts.

---

## 5. Application servers: requests per second per box

The single most-asked number: **how much traffic does one server handle?** The honest answer is "it depends on what it does per request," so carry a ladder.

### The mental model

```
rps_per_server ≈ cores × (1 / cpu_seconds_per_request) × 0.7 utilization headroom
```

If a request burns 5 ms of CPU, one core does 200 rps, so a 16-core box does ~3,200 rps at 100% and ~**2,200 rps at a safe 70%**.

| Work per request | CPU time | rps per core | rps on a 16-core box (at 70%) |
|---|---|---|---|
| Static file / health check | 0.05–0.1 ms | 10,000–20,000 | 100k–200k |
| Simple JSON echo, no I/O | 0.2–0.5 ms | 2,000–5,000 | 25k–55k |
| Cache read + serialize | 0.5–1 ms | 1,000–2,000 | 12k–22k |
| Typical CRUD: 1–3 DB queries + JSON | 2–10 ms | 100–500 | **1,500–5,500** |
| Heavy business logic / aggregation | 20–50 ms | 20–50 | 200–500 |
| Image resize / thumbnail | 50–200 ms | 5–20 | 50–200 |
| ML inference (small CPU model) | 10–100 ms | 10–100 | 100–1,000 |

> **The number to quote when in doubt: a typical API server handles ~1,000–5,000 rps of real business logic.** Modern hardware is fast; the classic "500 rps per server" figure is a decade out of date, but so is assuming 50k.

### By runtime (16-core box, "hello world" vs. realistic CRUD)

| Stack | Trivial response | Realistic request (DB + JSON) | Concurrency model |
|---|---|---|---|
| Rust (Actix, Axum) | 200k–1M rps | 10k–50k rps | async, work-stealing |
| Go (net/http, Fiber) | 100k–500k rps | 8k–40k rps | goroutines (M:N) |
| Java / Kotlin (Netty, Vert.x, Spring WebFlux) | 100k–400k rps | 8k–30k rps | event loop / virtual threads |
| Java Spring Boot (blocking MVC) | 30k–100k rps | 3k–15k rps | thread per request |
| C# / .NET (ASP.NET Core, Kestrel) | 100k–400k rps | 8k–30k rps | async |
| Node.js (single process) | 8k–20k rps | 1k–4k rps | single-threaded event loop |
| Node.js (cluster, 16 workers) | 60k–150k rps | 6k–20k rps | process per core |
| Python (FastAPI + uvicorn, async) | 5k–20k rps | 1k–5k rps | async |
| Python (Django/Flask + gunicorn sync) | 2k–8k rps | 300–2,000 rps | process/thread per request |
| Ruby on Rails (Puma) | 2k–8k rps | 300–2,000 rps | thread/process |
| PHP (PHP-FPM, 8.x + OPcache) | 5k–20k rps | 500–3,000 rps | process per request |

**Interpretation for interviews:** language choice moves throughput by ~10× on trivial work but only ~3× on realistic work, because realistic work is dominated by I/O waits and serialization. Say this out loud — it shows you know where the time actually goes.

### Connections, threads and memory

| Quantity | Typical value | Notes |
|---|---|---|
| Idle TCP connection kernel memory | 4–16 KB | Plus app buffers |
| Connection with app buffers | 20–100 KB | Node/Java per-socket overhead |
| Max concurrent connections per box | **100k–1M** | The "C10M" problem; needs tuning of `somaxconn`, file descriptors, ephemeral ports |
| Practical WebSocket connections per node | **50k–200k** | 500k–1M achievable with lean runtimes (Go/Erlang/Rust) |
| Ephemeral port exhaustion | **~28k–64k** per (src IP, dst IP, dst port) tuple | Why outbound connection pooling matters |
| OS thread stack (default) | 1–8 MB virtual, ~8–64 KB resident | Limits thread-per-request models to ~a few thousand |
| Goroutine / virtual thread | 2–8 KB | Enables 100k+ concurrent handlers |
| Java G1 GC pause | 50–200 ms | Often the real cause of p99 spikes |
| Java ZGC / Shenandoah pause | < 1–10 ms | Choose for latency-sensitive services |
| JVM heap sweet spot | 8–31 GB | Stay under 32 GB for compressed OOPs |
| Container startup (image pulled) | 0.5–3 s | Affects autoscaling reaction time |
| Autoscaling reaction time (end to end) | **1–5 min** | Why you provision for peak, not average |

---

## 6. Load balancers, proxies and API gateways

| System | Throughput | Latency added | Concurrent connections |
|---|---|---|---|
| NGINX (static/reverse proxy) | 50k–500k rps per box; 10k–50k rps per core | **0.1–1 ms** | 100k–1M |
| HAProxy | 100k–500k rps per box | **0.1–0.5 ms** | 1–2M |
| Envoy (sidecar/mesh) | 10k–50k rps per core | **0.3–2 ms** per hop | 100k+ |
| Traefik / Caddy | 20k–100k rps per box | 0.5–2 ms | 50k+ |
| AWS NLB (L4) | Millions of rps, tens of Gbps | **~0.1 ms** | Millions of flows |
| AWS ALB (L7) | 100k+ rps (scales automatically, pre-warm for spikes) | **1–5 ms** | Tens of thousands per LCU |
| AWS API Gateway (REST) | 10,000 rps default quota per region | **10–50 ms** | 29 s max integration timeout |
| Cloudflare / CDN edge | Effectively unbounded | 5–30 ms to edge | — |
| Service mesh (2 sidecars per call) | — | **+1–4 ms p99** | The classic mesh tax |

### TLS termination — the CPU cost people forget

| Operation | Per core |
|---|---|
| RSA-2048 handshakes | **1,000–2,000 /s** |
| ECDSA P-256 handshakes | **5,000–15,000 /s** |
| Resumed sessions (ticket/PSK) | 20,000–50,000 /s |
| AES-GCM bulk encryption (AES-NI) | **1–10 GB/s** |

A fleet taking 50,000 new HTTPS connections per second with RSA certs needs **~30 cores of pure handshake work**. Keep-alive and session resumption are not micro-optimizations; they are capacity decisions.

### Load balancing algorithms — when each wins

| Algorithm | Best for | Caveat |
|---|---|---|
| Round robin | Uniform requests, uniform servers | Ignores slow servers |
| Least connections | Variable request duration | Needs shared state or per-LB view |
| **Power of two choices** | Large fleets | Near-optimal with O(1) state — the modern default |
| Consistent hashing | Cache affinity, sticky sessions | **100–200 virtual nodes per physical node** to balance within ±5% |
| Latency/EWMA weighted | Heterogeneous fleets | Can oscillate without damping |

---

## 7. Caching: Redis, Memcached and friends

### Redis / Valkey figures of merit

| Metric | Value |
|---|---|
| **Server-side latency, simple GET/SET** | **0.05–0.2 ms** (p50 ~0.1 ms) |
| **Client-observed latency, same AZ** | **0.2–1 ms** (p99 ~1–2 ms) — dominated by network RTT |
| Client-observed latency, cross-AZ | 1–3 ms |
| Throughput, single instance (single-threaded core) | **80k–150k ops/sec** |
| Throughput with pipelining (batches of 10–100) | **500k–1.5M ops/sec** |
| Throughput with I/O threads (Redis 6+, 4–8 threads) | 200k–500k ops/sec |
| Memcached (multithreaded, 8+ cores) | **500k–1M+ ops/sec** |
| Network is the limit at | ~100k ops/s × 1 KB = 800 Mbps |
| Max value size (hard limit) | 512 MB — **keep values < 10 KB, ideally < 1 KB** |
| "Big key" warning threshold | > 10 KB value or > 5,000 collection elements |
| Practical memory per node/shard | **10–50 GB** (up to 100–256 GB, but failover/RDB fork/replication get painful) |
| Memory overhead per key | ~50–100 B (plus key and value) |
| Redis Cluster hash slots | **16,384** (fixed) |
| Redis Cluster recommended max nodes | **~1,000** |
| Replication lag (async) | **< 1–10 ms** same AZ |
| Failover time (Sentinel/Cluster) | **1–30 s** (dominated by failure detection timeout) |
| `KEYS *` on 1M keys | **Blocks for ~100 ms–1 s** — never do it; use `SCAN` |
| Persistence: RDB fork on 20 GB dataset | 100 ms–1 s latency spike (copy-on-write) |
| AOF `everysec` write overhead | < 1 ms typical, fsync spikes |
| HyperLogLog: cardinality of billions | **12 KB, 0.81% standard error** |
| Redis Streams / Pub-Sub throughput | 100k–1M msgs/sec (no durability guarantees in Pub/Sub) |

### The cache math you should show on the whiteboard

```
effective_latency = hit_ratio × cache_latency + (1 − hit_ratio) × origin_latency
```
With a 95% hit ratio, 0.5 ms cache and 20 ms DB: `0.95 × 0.5 + 0.05 × 20 = 1.5 ms` — a **13× improvement**, and the backend sees **20× less load**.

| Cache metric | Healthy target |
|---|---|
| Hit ratio, hot-key workload | **90–99%** |
| Hit ratio, long-tail workload | 50–80% |
| Cache size needed for 80% hit rate | Often only **10–20% of the dataset** (Zipf/Pareto) |
| TTL for volatile data | 30 s – 5 min |
| TTL for reference data | 1–24 h |
| CDN/browser TTL for static assets | 1 year + content hash in filename |

**Failure modes with numbers:** a **thundering herd** on one expired hot key can send 10,000 simultaneous requests to a database that handles 500 — the fix is request coalescing / single-flight or probabilistic early expiry. A **hot key** taking more than ~20–25% of a shard's traffic will saturate one core regardless of cluster size — the fix is client-side local caching or key splitting (`key:shard:0..N`). A **cold-start** cache after a deploy can take the origin down; warm it or ramp traffic.

### Other cache tiers

| Layer | Latency | Capacity | Notes |
|---|---|---|---|
| CPU/local process cache (Caffeine, LRU map) | **~100 ns – 1 µs** | MBs–GBs | Fastest, but per-instance inconsistency |
| Redis / Memcached (same AZ) | 0.2–1 ms | 10s of GB per node, TBs per cluster | Shared, consistent |
| CDN edge | 10–50 ms (to user) | Effectively unlimited | 85–95% offload target |
| Database buffer pool / page cache | 1–100 µs | RAM-sized | Free and often forgotten |
| Materialized view / precomputed table | 1–10 ms | Disk-sized | Trades freshness for latency |

---
## 8. Relational databases: PostgreSQL and MySQL

This is where interviews live or die, because "when do I shard?" is the single most common follow-up question in the entire format.

### PostgreSQL figures of merit

| Metric | Value |
|---|---|
| Point lookup by primary key (warm, in buffer cache) | **0.1–0.5 ms** |
| Point lookup requiring disk (NVMe) | 0.5–2 ms |
| Simple indexed query returning 100 rows | 1–5 ms |
| Unindexed scan of 1M rows | **200 ms – 2 s** |
| Single-row INSERT/UPDATE commit (fsync, NVMe) | **0.5–2 ms** |
| Read throughput, single node (in-memory working set) | **20k–100k QPS** (point reads, prepared statements) |
| Write throughput, single node | **5k–20k TPS** (up to 50k+ with batching/group commit and fast WAL disk) |
| pgbench TPC-B-like on a big box | 10k–30k TPS |
| `max_connections` default | **100** |
| Memory per backend connection | **5–15 MB** |
| Practical connection limit without pooling | **200–500** (performance degrades past ~2–4× core count of *active* connections) |
| PgBouncer pool size rule of thumb | **`(cores × 2) + effective_spindles`**, typically 20–100 server connections |
| PgBouncer capacity | 10k+ client connections per instance, ~1–2 ms added |
| `shared_buffers` | 25% of RAM (rest to OS page cache) |
| Page size | **8 KB** |
| Row overhead (tuple header) | ~24–28 B |
| Max table size | 32 TB (default block size) |
| Max row size | 1.6 TB (via TOAST); values > 2 KB TOASTed out-of-line |
| Max columns per table | 250–1,600 |
| **Partition a table at** | **> 100 GB or > 100M rows** (declarative partitioning; keep partitions < 100 and ideally < 1,000) |
| **Shard the database at** | **> 1–2 TB of hot data, > 10–20k write TPS, or when the working set stops fitting in RAM** |
| Practical max data on one node | **2–10 TB** (backups, `VACUUM`, index rebuilds, failover all get slow past this) |
| Read replicas per primary | **5–15** (cascade beyond that) |
| Streaming replication lag (async, same region) | **1–100 ms**; seconds under heavy write load |
| Synchronous replication cost | +1 RTT per commit (+0.5–2 ms same-region, +60–100 ms cross-region) |
| Logical replication / CDC lag | 10 ms – 1 s |
| Index size | ~**10–40%** of table size per B-tree index |
| B-tree depth for 100M rows | 3–4 levels (≈ 3–4 page reads worst case) |
| Autovacuum threshold | 20% of rows changed (default); tune to 2–5% for hot tables |
| Transaction ID wraparound | **2.1 B transactions** — must vacuum before this or the DB shuts down |
| Bloat if vacuum lags | 20–200% table growth |
| Failover time (Patroni/RDS Multi-AZ) | **30–120 s** |
| Backup/restore of 1 TB | 30 min – 4 h (physical); 4–24 h logical (`pg_dump`) |
| Connection establishment cost | 5–20 ms (process fork) — **always pool** |

### MySQL / InnoDB figures of merit

| Metric | Value |
|---|---|
| Point lookup by PK (in buffer pool) | **0.1–0.3 ms** |
| Read throughput, single node | **30k–150k QPS** (point reads; sysbench on modern hardware) |
| Write throughput, single node | **5k–30k TPS** (`innodb_flush_log_at_trx_commit=1`); 50k–100k+ with `=2` (risk of losing ~1 s on crash) |
| `max_connections` default | **151** (practical 500–2,000 with thread pool) |
| Memory per connection | 256 KB – 1 MB (much lighter than Postgres) |
| `innodb_buffer_pool_size` | **70–80% of RAM** — the single most important setting |
| Page size | **16 KB** |
| Clustered index | PK is the clustered index → **use a monotonic PK**; random UUID PKs cause page splits and can cut insert throughput by 2–5× |
| Secondary index lookup | Index → PK → row (2 B-tree traversals) |
| **Partition a table at** | **> 50–100M rows or > 50–100 GB** |
| **Shard at** | **> 500 GB – 1 TB per instance, or > 10–20k write TPS** |
| Vitess/PlanetScale shard size guidance | **≤ 250–500 GB per shard** (for fast backup, restore and resharding) |
| Replication lag (single-threaded legacy) | seconds to minutes under load |
| Replication lag (parallel replication, MySQL 8) | **10–500 ms** typical |
| Group Replication / InnoDB Cluster write cost | +1 RTT for consensus |
| Online DDL on 100M-row table | minutes to hours (use `gh-ost` / `pt-online-schema-change`) |
| Failover (Orchestrator / RDS) | 30–120 s |
| Aurora MySQL/Postgres | Up to 15 read replicas, < 100 ms replica lag, 128 TB volume, 6 copies across 3 AZs |

### Cloud managed limits worth quoting

| Service | Figure |
|---|---|
| Amazon RDS max storage | 64 TB (Postgres/MySQL), 128 TB Aurora |
| Aurora replica lag | typically **< 20–100 ms** (shared storage, not log shipping) |
| Google Cloud Spanner | Externally consistent; **~10 ms** commit latency regional, 5–10× that multi-region; splits at ~a few GB; 10k+ QPS per node |
| CockroachDB | ~2–10 ms reads regional, ranges split at **512 MB**, linear scaling to 100s of nodes |
| Vitess | Powers YouTube-scale MySQL; 10k+ shards possible |
| Citus (distributed Postgres) | Shard count typically **32–128 shards per node group**; 1 GB–50 GB per shard |

### The five signals that you have outgrown one relational node

1. **Working set > RAM.** Buffer cache hit ratio drops below ~98% and p99 explodes (0.2 ms → 5 ms).
2. **Write throughput > ~10–20k TPS**, or WAL/binlog writes saturating the disk.
3. **Data > 1–2 TB**, making backups, restores, index builds and failover operationally painful.
4. **Vertical scaling exhausted** — you are already on the biggest instance and it is 70% utilized.
5. **Replica lag persistently > 1 s**, breaking read-after-write expectations.

> The correct interview ordering is: **index → cache → read replicas → partition → archive cold data → shard.** Sharding is the last resort because it costs you cross-shard joins, distributed transactions, and rebalancing. Say the ladder out loud before you jump to sharding.

---

## 9. When to shard: the thresholds table

A compact answer to "at what point do you split this?" for every storage technology.

| Technology | Unit | Comfortable | Act at | Hard limit |
|---|---|---|---|---|
| PostgreSQL table | rows | < 100M | **100M+ → partition** | 32 TB/table |
| PostgreSQL instance | data size | < 1 TB | **1–2 TB → shard** | 2–10 TB practical |
| MySQL table | rows | < 50M | **50–100M → partition** | ~64 TB/table |
| MySQL instance | data size | < 500 GB | **500 GB–1 TB → shard** | ~2 TB practical |
| MySQL/Postgres writes | TPS | < 5k | **10–20k → shard** | ~50k with tricks |
| Redis node | memory | < 25 GB | **> 50 GB → cluster** | 256 GB+ (painful) |
| Cassandra partition | bytes/rows | < 10 MB / 100k rows | **> 100 MB → change partition key** | 2 GB (fails) |
| Cassandra node | data | 1–2 TB | **> 2 TB → add nodes** | 4–10 TB (Scylla higher) |
| MongoDB shard | data | < 1–2 TB | **> 2–3 TB → add shards** | — |
| MongoDB document | bytes | < 100 KB | approaching 16 MB → restructure | **16 MB** |
| DynamoDB partition | throughput | < 2,000 RCU | **3,000 RCU / 1,000 WCU → split key** | 10 GB per partition |
| DynamoDB item | bytes | < 4 KB (1 RCU) | > 100 KB → offload to S3 | **400 KB** |
| Elasticsearch shard | bytes | 10–30 GB | **> 50 GB → more shards** | 2.1B docs (Lucene) |
| Kafka partition | throughput | < 10 MB/s | > 10–30 MB/s → more partitions | — |
| Kafka broker | partitions | < 2,000 | **> 4,000 → more brokers** | ~4,000 (ZK), far more with KRaft |
| Kafka message | bytes | < 100 KB | > 1 MB → claim-check pattern | 1 MB default (`message.max.bytes`) |
| etcd | DB size | < 2 GB | **> 2 GB → reduce/compact** | 8 GB |
| ZooKeeper znode | bytes | < 1 KB | > 100 KB → move to a DB | **1 MB** |
| S3 prefix | rps | < 3,000 writes/s | **→ add prefixes** | 3,500 PUT / 5,500 GET per prefix |
| Prometheus server | active series | < 2M | **> 5–10M → federate/remote-write** | ~10M per server |

---

## 10. NoSQL: DynamoDB, Cassandra, ScyllaDB, MongoDB, HBase

### DynamoDB — the limits *are* the design

| Metric | Value |
|---|---|
| Latency (single-item read/write) | **p50 2–5 ms, p99 10–20 ms** |
| With DAX cache | **microseconds–1 ms** for reads |
| 1 RCU | 1 strongly consistent read of **4 KB/s** (2 eventually consistent reads) |
| 1 WCU | 1 write of **1 KB/s** |
| Per-partition ceiling | **3,000 RCU** and **1,000 WCU** |
| Per-partition storage | **10 GB** |
| Max item size | **400 KB** |
| Query/Scan page size | **1 MB** |
| BatchGetItem | 100 items / 16 MB |
| BatchWriteItem | 25 items / 16 MB |
| TransactWriteItems | **100 items**, 4 MB |
| Global Secondary Indexes | 20 per table (soft), LSIs 5 (hard) |
| Default table throughput quota | 40,000 RCU / 40,000 WCU per table (soft) |
| Adaptive capacity / burst | 300 s of unused capacity bursted |
| Global tables replication lag | **< 1 s typical** (last-writer-wins) |
| Streams retention | 24 h |

**Design consequence:** a hot partition is the #1 DynamoDB failure. If one key takes > 1,000 writes/s you must add a write-sharding suffix (`pk#0..N`). Quote this — it is the expected answer.

### Cassandra / ScyllaDB

| Metric | Cassandra | ScyllaDB |
|---|---|---|
| Writes per node | **10k–50k /s** | **100k–1M /s** |
| Reads per node | 5k–30k /s | 100k–500k /s |
| Write latency p99 | 5–15 ms | **< 1–5 ms** |
| Read latency p99 | 10–50 ms | 1–10 ms |
| Data per node | **1–2 TB** | 4–30 TB (shard-per-core, no JVM GC) |
| Partition size target | **< 10 MB, hard warn 100 MB** | same |
| Rows per partition | < 100,000 | same |
| Tombstone warn / fail thresholds | **1,000 / 100,000** per query | same |
| Compaction space overhead | **up to 50% free disk (STCS)**; LCS ~10% | similar |
| Typical topology | RF=3, `LOCAL_QUORUM` | same |
| Cluster size in production | 10s–1,000+ nodes | 3–100s |
| Repair cadence | Every `gc_grace_seconds` (default **10 days**) | same |

**The Cassandra interview answer:** the data model is the query. Writes are cheap (LSM-tree, append-only ≈ memtable write ~µs), reads across partitions are expensive, deletes create tombstones that make reads *slower*, and a partition key with unbounded growth (e.g. `user_id` for an event log) is the classic mistake — bucket it by time (`user_id + yyyymm`).

### MongoDB

| Metric | Value |
|---|---|
| Max document size | **16 MB** (nesting depth 100) |
| Read/write throughput per node | **10k–50k ops/s** |
| Latency (indexed query) | 0.5–5 ms |
| WiredTiger cache | **50% of RAM − 1 GB** |
| Shard chunk size | **128 MB** default |
| Shard when | data per shard > **2–3 TB**, or working set > RAM |
| Replica set members | 50 max (**7 voting**) |
| Typical replication lag | 10 ms – 1 s |
| Index limit | 64 per collection |
| Aggregation pipeline stage memory | 100 MB (spills to disk when allowed) |
| Change streams lag | < 100 ms – 1 s |

### HBase / Bigtable

| Metric | Value |
|---|---|
| Latency (point read) | **1–10 ms** (Bigtable p50 ~2–6 ms) |
| Throughput per node | **10k QPS per Bigtable node** (rule of thumb: 10,000 reads or writes/s per node at 1 KB rows) |
| Region/tablet size | 5–10 GB (HBase); Bigtable tablets split automatically |
| Row size guidance | < 10 MB per row, < 100 MB per row hard |
| Scaling | Linear with nodes — quote "add a node, get 10k QPS" |

### Choosing between them — the number-driven answer

| If you need… | Choose | Because |
|---|---|---|
| Transactions, joins, ad-hoc queries, < 1–2 TB | PostgreSQL/MySQL | 10k–20k TPS is plenty for most products |
| Predictable single-digit-ms KV at any scale, managed | DynamoDB | Partition-level limits are explicit |
| Huge write volume, multi-region active-active | Cassandra/Scylla | 100k+ writes/s per cluster, tunable consistency |
| Flexible documents, moderate scale | MongoDB | 16 MB docs, easy sharding |
| Massive sorted scans, time series over rows | HBase/Bigtable | Range scans are native |

---
## 11. Search engines: Elasticsearch and OpenSearch

| Metric | Value |
|---|---|
| **Shard size sweet spot** | **10–50 GB** — 20–25 GB for search workloads, 30–50 GB for logs |
| Absolute max docs per shard | **2,147,483,519 (2³¹ − 1)** — a Lucene limit |
| **Shards per node** | **≤ 20 shards per GB of heap** → ~600 shards on a 30 GB heap; aim much lower |
| JVM heap | **50% of RAM, never above 31 GB** (compressed object pointers) |
| RAM per node | 32–64 GB typical (half heap, half OS page cache for Lucene) |
| Indexing throughput per node | **10k–50k docs/s** (small docs, bulk) |
| Bulk request size | **5–15 MB** per request |
| Query latency (simple term/match, warm) | **5–50 ms** |
| Query latency (aggregations over 100M docs) | **100 ms – 2 s** |
| `refresh_interval` (near-real-time visibility) | **1 s** default; raise to **30 s** for ingest-heavy workloads (2–5× indexing gain) |
| Replica count | 1 (i.e. 2 copies) typical |
| Index size vs raw data | **1.1–2× raw JSON** (or 0.3–0.6× with `_source` disabled / best_compression) |
| Cluster size | 3 dedicated masters + N data nodes; 10s–100s of nodes |
| Deep pagination limit | `from + size ≤ 10,000` → use `search_after` / PIT |
| Scroll / PIT context | Keep alive 1–5 min |
| Recovery/rebalance of a 50 GB shard | Minutes (network-bound) — the reason to cap shard size |

**Shard count formula to state in an interview:**
```
primary_shards ≈ ceil(expected_index_size_GB / 30 GB)
total_shards   = primary_shards × (1 + replicas)
nodes          ≈ total_shards / shards_per_node_budget
```
For 3 TB of logs: 3,000 / 30 = **100 primaries**, ×2 with replicas = 200 shards, over nodes holding ~50 shards each ⇒ **~4–8 data nodes** (disk will probably decide it first).

**Oversharding is the classic mistake.** Each shard is a full Lucene index with its own heap, file handles and merge threads. 1,000 tiny shards cost more than 50 healthy ones. Use ILM/rollover on time-based indices at a fixed size (e.g. roll at **50 GB** or **1 day**).

### Other search options

| System | Figure of merit |
|---|---|
| Apache Solr | Comparable to ES; shard 10–50 GB; strong for faceting |
| Typesense / Meilisearch | Sub-**50 ms** search, in-memory, best under ~10–50M docs |
| Algolia (hosted) | **1–20 ms** search latency, scales by managed replicas |
| PostgreSQL full-text (`tsvector` + GIN) | Fine up to **1–10M docs**; GIN index build is slow; no relevance tuning depth |
| OpenSearch k-NN / ES dense_vector | Adds vector search — see §17 |

---

## 12. Streaming and messaging

### Apache Kafka — the numbers interviewers probe

| Metric | Value |
|---|---|
| Throughput per broker | **100 MB/s – 1 GB/s** (commodity: ~100–300 MB/s write; NVMe + 25 GbE far higher) |
| Messages per second per broker | **100k–1M+** (1 KB messages, batched) |
| Throughput per partition (planning number) | **~10 MB/s write, 10–30 MB/s read** |
| End-to-end latency, `acks=all`, `linger.ms=0` | **5–20 ms p99** (tuned clusters < 10 ms) |
| Producer batch/linger tradeoff | `linger.ms=5–100` buys 2–10× throughput for that much latency |
| **Partitions per broker** | **≤ 4,000** (ZooKeeper era); **1,000–2,000 is the comfortable planning number** |
| **Partitions per cluster** | **≤ 200,000** with ZooKeeper; **millions** with KRaft (tested to ~2M) |
| Topics per cluster | Practically bounded by partitions: **10k–100k topics** is achievable; each topic ≥ 1 partition × RF files on disk |
| Partition count formula | `max(target_in_throughput / per_partition_write, target_out_throughput / per_consumer_rate)` |
| Consumer parallelism | **1 consumer per partition per group** — partitions are the parallelism cap |
| Replication factor | **3** (with `min.insync.replicas=2`) |
| Max message size | **1 MB** default (`message.max.bytes` = 1,048,588) — keep < 100 KB, use claim-check in S3 beyond |
| Retention | **7 days** default; sizing = `throughput × retention × RF` |
| Disk for 100 MB/s × 7 days × RF3 | 100 MB/s × 604,800 s × 3 ≈ **180 TB** |
| Consumer rebalance time | **seconds to minutes** (cooperative/incremental rebalancing reduces it dramatically) |
| Broker restart / recovery | 1–10 min with large partition counts (log recovery) |
| Typical cluster size | 3–30 brokers; LinkedIn-scale: 100s of brokers, 7 trillion msgs/day |
| Zero-copy `sendfile` path | Why Kafka reads are near disk speed |
| Exactly-once (transactions) overhead | **10–30% throughput cost**, +few ms latency |

> **The Kafka sizing sentence to memorize:** *"I'll size partitions as max(in-throughput / 10 MB/s, out-throughput / consumer-rate), keep it under ~2,000 per broker with RF 3, and size disk as throughput × retention × 3."*

### The rest of the messaging landscape

| System | Throughput | Latency | Key limits |
|---|---|---|---|
| **Apache Pulsar** | 100k–1M+ msgs/s per broker | p99 **5–20 ms** | **Millions of topics** (tiered by BookKeeper); compute/storage separated; geo-replication built in |
| **Redpanda** | 1–3× Kafka per core (no JVM, thread-per-core) | p99 **< 10 ms** | Kafka API compatible; fewer GC-induced tail spikes |
| **RabbitMQ (classic queue)** | **20k–50k msgs/s per queue**, 100k+ per node across queues | **< 1–5 ms** | Single queue is a single Erlang process → one queue is the bottleneck |
| **RabbitMQ (quorum queue)** | 5k–20k msgs/s per queue | 5–20 ms | Raft-replicated; keep queues **short (< 10k messages)** or memory alarms fire at **40% RAM** |
| **Amazon SQS (standard)** | **Effectively unlimited** (scales automatically) | 10–100 ms | 256 KB message (2 GB via extended client), retention 4 d default / **14 d** max, visibility timeout 30 s default / 12 h max, at-least-once |
| **Amazon SQS (FIFO)** | **300 msg/s**, **3,000/s with batching of 10**; high-throughput mode up to 9,000+/s per API action | 10–100 ms | Exactly-once processing within a 5-min dedup window |
| **Amazon Kinesis Data Streams** | **Per shard: 1 MB/s or 1,000 records/s in; 2 MB/s out** (5 `GetRecords`/s) | 70 ms – 200 ms (enhanced fan-out ~70 ms) | Record 1 MB max, retention 24 h default → **365 days** max, 20 consumers with EFO |
| **Google Pub/Sub** | Unlimited (auto-scaling) | 100 ms p50 publish→deliver | 10 MB message, 7-day retention, at-least-once (exactly-once opt-in) |
| **Azure Event Hubs** | **1 TU = 1 MB/s in, 2 MB/s out, 1,000 events/s** | 10–100 ms | 32 partitions per hub (standard), 1 MB event |
| **NATS Core** | **1M–10M msgs/s** per server | **< 1 ms** (µs in-memory) | Fire-and-forget; JetStream adds persistence (100k–1M msgs/s) |
| **ActiveMQ / Artemis** | 10k–100k msgs/s | 1–10 ms | JMS semantics |
| **AWS EventBridge** | 10,000 events/s default (raisable) | 0.5–2 s typical | 256 KB events, rule-based routing |
| **AWS SNS** | Effectively unlimited fan-out | 10–100 ms | 256 KB message, 12.5M subscriptions/topic |
| **MQTT (EMQX/Mosquitto)** | 100k–1M+ connections per node | < 10 ms | IoT: QoS 0/1/2, small payloads |

**How to choose, with numbers:**
- Need **replay, ordering per key, multiple independent consumers, > 100k msgs/s** → **Kafka/Pulsar/Redpanda**.
- Need **per-message routing, priorities, delays, complex topologies, < 50k msgs/s** → **RabbitMQ**.
- Need **zero operations** and traffic is spiky → **SQS/Pub/Sub** (and accept 10–100 ms latency and at-least-once).
- Need **µs latency, no durability** → **NATS core / Redis Pub-Sub**.

**Delivery semantics cost:** at-most-once is free; at-least-once costs you idempotency handling at the consumer; exactly-once costs **10–30% throughput** and only works within the system's transactional boundary. Say this — interviewers love it.

---

## 13. Stream processing: Flink, Spark, Kafka Streams

| Framework | Throughput | Latency | State | Notes |
|---|---|---|---|---|
| **Apache Flink** | **1M+ events/s per cluster**, 100k–500k/s per task slot | **10–100 ms** (true streaming) | RocksDB backend, **GBs–TBs** of state | Checkpoint interval **1 s – 5 min**; exactly-once via barriers; the default choice for stateful streaming |
| **Kafka Streams** | 100k–1M events/s | 10–100 ms | RocksDB local state, sized per partition | No separate cluster — it is a library; scales by adding instances (capped by partitions) |
| **Spark Structured Streaming** | Very high throughput (batch-based) | **100 ms – seconds** (micro-batch); continuous mode lower | Checkpoint to HDFS/S3 | Best when you already run Spark; latency floor is the batch interval |
| **Apache Beam** | Engine-dependent | Engine-dependent | — | Portability layer over Flink/Dataflow |
| **Materialize / RisingWave** | 100k+ updates/s | **< 100 ms** incremental view maintenance | — | SQL-native streaming views |

**Numbers that matter in design answers:**
- **Watermarks / allowed lateness:** typical 1 s – 1 min; anything later goes to a side output.
- **Checkpoint interval vs recovery time:** a 1-minute interval means up to ~1 minute of reprocessing on failure; checkpointing 100 GB of state to S3 takes minutes — use incremental checkpoints.
- **Window sizes:** tumbling 1 min – 1 h for analytics; session gaps 5–30 min.
- **Backpressure:** if consumer lag grows monotonically, you are under-provisioned; Kafka consumer lag is the canonical alert (**alert at > 1–5 min of lag**).
- **Shuffle in Spark:** target **128 MB per partition**; more than ~200 partitions per core creates scheduling overhead.

---

## 14. Object storage and CDN

### S3 / GCS / Azure Blob

| Metric | Value |
|---|---|
| **Request rate per prefix (S3)** | **3,500 PUT/COPY/POST/DELETE per second** and **5,500 GET/HEAD per second** — unlimited prefixes, so parallelize across prefixes |
| First-byte latency (S3 Standard) | **100–200 ms** |
| First-byte latency (S3 Express One Zone) | **< 10 ms** |
| Throughput per connection | 50–100 MB/s |
| Throughput with parallelism | **Up to 100 Gbps** per instance with multipart + many connections |
| Max object size | **5 TB** |
| Multipart part size | 5 MB – 5 GB, **max 10,000 parts** |
| Single-PUT max | 5 GB |
| Durability | **99.999999999% (11 nines)** |
| Availability SLA | 99.9% (Standard); 99.99% design |
| Consistency | **Strong read-after-write** (since Dec 2020) |
| Listing | 1,000 keys per `ListObjectsV2` page |
| Glacier restore | Expedited 1–5 min, Standard **3–5 h**, Bulk 5–12 h |
| Versioning/lifecycle transitions | Per-object, minimum storage durations (30 d IA, 90 d Glacier) |

**Interview consequence:** object storage is for **bulk, immutable, large objects** — never for a hot key-value path (100 ms p50 vs Redis 0.3 ms). The standard pattern is *metadata in a DB, bytes in S3, access via presigned URLs served through a CDN*.

### CDN

| Metric | Value |
|---|---|
| Edge RTT to user | **10–50 ms** (vs 50–150 ms to origin) |
| Cache hit ratio target (static assets) | **90–99%** |
| Cache hit ratio target (dynamic/API) | 50–80% with careful keys |
| Origin offload at 95% hit rate | **20× reduction** in origin traffic |
| Number of PoPs (major CDNs) | 200–400+ |
| Purge propagation | **seconds to minutes** globally |
| TLS termination at edge | Saves origin ~1–2 RTT + handshake CPU |
| Typical asset TTL | 1 year (immutable, hashed filenames) |
| Cost | $0.02–0.09/GB egress (usually cheaper than origin egress) |

---

## 15. OLAP and warehouses

| System | Scan rate | Query latency | Key numbers |
|---|---|---|---|
| **ClickHouse** | **100M–2B rows/s per server** (multi-core, columnar, vectorized) | **10 ms – 1 s** on billions of rows | Compression **5–10×**; insert in batches of **10k–100k rows**, ideally ≤ 1 insert/s per partition (too many small parts = merge storm); 1 node handles TBs |
| **Apache Druid** | 100M+ rows/s | **sub-second** | Real-time + historical; segment target **300–700 MB / ~5M rows**; ingest 100k–1M events/s |
| **Apache Pinot** | 100M+ rows/s | **< 100 ms p99** | Built for user-facing analytics (LinkedIn); upserts supported |
| **Apache Doris / StarRocks** | 100M+ rows/s | sub-second | MPP, MySQL protocol |
| **BigQuery** | **TB/s aggregate** (thousands of slots) | **1–30 s** | Serverless; $5–6.25 per TB scanned; partition + cluster to cut scan cost 10–100× |
| **Snowflake** | Scales with warehouse size (XS→4XL = 1→128 nodes) | 1–60 s | Credits per hour per size; auto-suspend at 60 s idle |
| **Redshift** | 10–100M rows/s per node | seconds | Sort/dist keys matter enormously |
| **Presto / Trino** | Depends on source | seconds–minutes | Federated query; 10s–100s of workers |
| **Apache Spark (batch)** | GB/s per executor | minutes | 128 MB partitions, 2–5× cores in tasks |
| **DuckDB (single node)** | **100M–1B rows/s** | ms–s | Embedded OLAP; up to ~100s of GB on a laptop-class machine |

**Columnar rules of thumb:** columnar formats (Parquet/ORC) compress **5–10×** vs raw JSON, and column pruning + predicate pushdown often reads **1–10%** of the data. That combination is why a query over 1 TB of JSON becomes a query over 10 GB of Parquet — a **100× difference** worth stating explicitly.

**OLTP vs OLAP separation:** you run analytics on the primary until roughly **100M rows / a few hundred GB**; beyond that, an analytical query that scans 10M rows will hold locks/IO and hurt your 1 ms transactional p99. Ship to a warehouse via CDC (10 ms–1 s lag) or batch ETL (5 min–24 h).

---

## 16. Time series and observability

| System | Ingest | Cardinality limit | Storage per sample |
|---|---|---|---|
| **Prometheus (single server)** | **100k–1M samples/s** | **1M–10M active series** (practical: keep under 2–5M) | **1.3–2 bytes** compressed (Gorilla/XOR + delta) |
| **VictoriaMetrics** | 1M–10M samples/s per node | 10M–100M+ series | ~0.4–1.2 bytes |
| **Thanos / Cortex / Mimir** | Horizontally scaled | 100M+ series | Object storage backed, unlimited retention |
| **InfluxDB** | 500k–1M points/s per node | Cardinality-sensitive (the classic failure) | 2–3 bytes |
| **TimescaleDB** | 100k–1M rows/s | Postgres semantics | Compressed hypertables **10–20×** |
| **Datadog/New Relic (SaaS)** | Unlimited | Billed per custom metric | $$ per host/metric |

**Prometheus sizing math to quote:**
```
memory ≈ active_series × 4–8 KB          (≈ 4–8 GB RAM per 1M series)
disk   ≈ active_series × samples_per_s × bytes_per_sample × retention
       = 1M × (1/15s) × 1.5 B × 15 d ≈ 130 GB
```
- Default scrape interval **15 s**, retention **15 days**.
- **Cardinality is the killer:** a label with user IDs on a metric with 1M users is 1M series *per metric*. Bound every label; keep cardinality per metric under ~10k.
- **Logs:** raw application logs run **1–10 KB per event**; at 10k events/s that is 10–100 MB/s = **1–8 TB/day**. Sample aggressively, and keep hot retention to 7–30 days.
- **Traces:** one span ≈ 300 B–1 KB; sample at **0.1–10%** for high-traffic services (tail-based sampling to keep the errors).
- **Metrics vs logs vs traces cost ratio:** metrics are ~100–1,000× cheaper per unit of insight than raw logs. Design accordingly.

---

## 17. Vector databases and ANN search

| Metric | Value |
|---|---|
| Embedding dimensions | **384** (MiniLM), **768** (BERT-base), **1,536** (OpenAI ada-002/3-small), 3,072 (3-large) |
| Memory per vector (fp32) | `dims × 4 B` → **1.5 KB (384d), 3 KB (768d), 6 KB (1536d)** |
| HNSW graph overhead | `M × 8–16 B` per vector → +**0.2–1 KB** (M = 16–64) |
| RAM for 1M × 768d vectors (HNSW, fp32) | **~4–5 GB** |
| RAM for 100M × 768d vectors | **~400–500 GB** → shard across nodes |
| Scalar quantization (int8) | **4× smaller**, ~1–2% recall loss |
| Product quantization | **8–32× smaller**, 5–15% recall loss (rerank to recover) |
| Binary quantization | **32× smaller**, needs reranking |
| **Query latency (1M vectors, HNSW, top-10)** | **1–10 ms** |
| Query latency (100M vectors, sharded) | 10–100 ms |
| **QPS per node** | **1,000–10,000** at recall ≈ 0.95 (single-threaded per query, scales with cores) |
| HNSW build parameters | `M = 16–64`, `efConstruction = 100–500` |
| HNSW search parameter | `efSearch = 50–400` (higher = better recall, linearly more latency) |
| IVF parameters | `nlist ≈ sqrt(N)` (e.g. 4,000 for 16M), `nprobe = 8–64` |
| Index build time, 1M vectors | **1–10 min** (HNSW, multi-threaded) |
| Recall target | **0.90–0.99** — below 0.9 users notice |
| Brute force (exact) feasible up to | **~100k–1M vectors** (linear scan: 1M × 768d ≈ 3 GB of dot products ≈ 100 ms–1 s) |

| Engine | Figure of merit |
|---|---|
| **FAISS** (library) | Fastest raw; 1M–10M vectors per node in RAM; GPU support |
| **pgvector** | Good to **1–10M vectors**; HNSW index; keeps data next to your relational data |
| **Qdrant / Weaviate / Milvus** | 10M–1B+ vectors, distributed, filtering + hybrid search |
| **Pinecone (hosted)** | p95 **< 100 ms**; pods sized by vectors × dims |
| **Elasticsearch/OpenSearch k-NN** | Convenient if you already run it; slower than specialists at scale |

**RAG sizing sentence:** *"1M documents × 3 chunks each = 3M vectors at 1,536 dims fp32 ≈ 18 GB of raw vectors plus graph — one 64 GB node holds it in RAM, and I'd quantize to int8 before I need two."*

---

## 18. Graph databases

| Metric | Value |
|---|---|
| Neo4j traversal rate | **1M+ relationship hops/s per core** (index-free adjacency) |
| Single node capacity | 10s of billions of nodes/relationships (disk bound); practical working set in RAM |
| 2-hop neighborhood query | **1–10 ms** |
| 4+ hop query on a dense graph | **100 ms – seconds** (combinatorial explosion: 1,000 friends² = 1M paths) |
| Write throughput | 10k–50k tx/s |
| When a relational DB is fine | ≤ **2–3 joins deep**; beyond that, graph wins by orders of magnitude |
| Alternatives | JanusGraph/Neptune (distributed, 10s of thousands QPS), TigerGraph (parallel, deep-link analytics), or adjacency lists in Cassandra/Redis for simple social graphs |

**The social-graph interview answer:** a friends-of-friends query on 1,000-friend users touches ~1M edges. At scale you do not traverse live — you precompute and cache, exactly as feed systems do.

---

## 19. Coordination: ZooKeeper, etcd, Consul, Raft

| System | Read throughput | Write throughput | Limits |
|---|---|---|---|
| **ZooKeeper** | 50k–100k reads/s (served by any node) | **10k–20k writes/s** (leader-bound) | znode max **1 MB** (keep < 1 KB); ensemble **3, 5 or 7** nodes; watches are one-shot |
| **etcd** | 30k–90k reads/s (linearizable reads cost a quorum round) | **5k–15k writes/s** | DB size **2 GB default quota, 8 GB max**; keep < 1.5 GB; value 1.5 MB max; compaction/defrag required |
| **Consul** | 10k–50k reads/s | 5k–10k writes/s | Adds service discovery + health checks (typical check interval 10 s) |
| **Raft/Paxos commit** | — | **1 RTT to a majority** | Same-AZ ~1 ms, cross-region **60–100 ms per commit** |

**Rules to say out loud:**
- Coordination systems are **metadata stores, not data stores.** Kilobytes, not gigabytes.
- Quorum size is `(N/2) + 1`: a 5-node cluster tolerates 2 failures; a 3-node cluster tolerates 1. **Even-numbered clusters buy nothing.**
- Leader election / failure detection takes **1 × session timeout** (typically **5–30 s** for ZooKeeper, **1–2 s** election timeout for etcd/Raft).
- A **distributed lock** costs at least one consensus round trip (1–10 ms same region). If you need 100k locks/s, you do not need locks — you need partitioning.
- Cross-region consensus (Spanner-style) costs **~50–100 ms per write**. That is the entire reason "just make it globally strongly consistent" is not free.

---

## 20. Storage hardware

| Device | Random IOPS (4 KB) | Sequential throughput | Latency | Capacity |
|---|---|---|---|---|
| HDD 7,200 rpm | **80–200** | 100–250 MB/s | **4–10 ms** | 1–24 TB |
| SATA SSD | 50k–100k | 500–550 MB/s | **100–200 µs** | 0.5–8 TB |
| NVMe SSD (PCIe 3) | 300k–600k | 2–3.5 GB/s | **50–100 µs** | 0.5–8 TB |
| NVMe SSD (PCIe 4/5) | 600k–1.5M | **5–14 GB/s** | **20–80 µs** | 1–30 TB |
| Persistent memory / Optane | 1M+ | 6+ GB/s | **< 10 µs** | 128–512 GB |
| RAM | ~10M+ "IOPS" | 10–50 GB/s per socket | **~100 ns** | 64 GB–24 TB |

| Cloud block storage | Figure |
|---|---|
| **AWS EBS gp3** | Baseline **3,000 IOPS / 125 MB/s**, up to **16,000 IOPS / 1,000 MB/s**; latency **1–2 ms** |
| **AWS EBS io2 Block Express** | Up to **256,000 IOPS / 4,000 MB/s**, sub-millisecond, 99.999% durability |
| **Instance store (NVMe local)** | 100k–3M IOPS, **ephemeral** — lost on stop |
| **AWS EFS / NFS** | 10s of thousands of IOPS, **1–10 ms** latency, elastic throughput |
| **GCP pd-ssd** | 30 IOPS/GB up to 100k, ~1 ms |

**Design consequences worth stating:**
- Network-attached storage costs **~1–2 ms per I/O** vs **~50 µs** local NVMe — a 20–40× difference that dominates database p99. This is why high-performance databases use local NVMe plus replication instead of EBS.
- **Sequential is 100–1,000× faster than random on HDDs, ~2–5× on NVMe.** That asymmetry is why LSM-trees (Cassandra, RocksDB, ClickHouse) convert random writes into sequential ones.
- **Write amplification:** LSM compaction amplifies writes **5–30×**; B-trees amplify by page size (a 100-byte update rewrites an 8–16 KB page = **80–160×**). Pick the tree for your read/write ratio.
- Never fill a disk past **70–80%** — SSD garbage collection and LSM compaction both need headroom.

---
## 21. Serverless and edge

| Metric | AWS Lambda | Notes |
|---|---|---|
| Cold start (Node.js / Python) | **100–400 ms** | Add 0.5–2 s inside a VPC in the old ENI model (now ~ms) |
| Cold start (Java / .NET) | **1–5 s** (SnapStart: ~200–400 ms) | Why JVM serverless needs provisioned concurrency |
| Warm invocation overhead | **1–10 ms** | Plus your code |
| Default concurrency limit | **1,000 per region** (raisable to 10k+) | Burst 500–3,000 depending on region |
| Scaling rate | +1,000 concurrent executions per 10 s (per function) | Fast, but not instant |
| Max memory / vCPU | **10 GB** (~6 vCPU, CPU scales with memory) | 1,769 MB ≈ 1 vCPU |
| Max execution time | **15 minutes** | Longer work → Step Functions / ECS / Batch |
| Payload | 6 MB sync, 256 KB async | Bigger → S3 |
| `/tmp` storage | 512 MB – 10 GB | |
| Pricing | ~**$0.20 per 1M requests** + $0.0000166667 per GB-second | Crossover vs. always-on EC2/containers at roughly **30–50% sustained utilization** |

| Edge platform | Figure |
|---|---|
| Cloudflare Workers | **< 5 ms cold start** (V8 isolates), 128 MB memory, 10–50 ms CPU per request |
| Lambda@Edge / CloudFront Functions | CF Functions < 1 ms, sub-ms JS; Lambda@Edge 5–50 ms |
| Edge KV stores | Read **5–30 ms** at edge, eventual consistency (propagation seconds–60 s) |

**The serverless number that decides architectures:** concurrency = `rps × duration`. 1,000 rps × 200 ms = **200 concurrent executions**. 1,000 rps × 3 s = **3,000 concurrent** — over the default limit, and a throttling incident waiting to happen.

---

## 22. Kubernetes and orchestration limits

| Metric | Value |
|---|---|
| Pods per node (default) | **110** (configurable to 250+; kubelet-tested) |
| Nodes per cluster | **5,000** |
| Total pods per cluster | **150,000** |
| Total containers per cluster | 300,000 |
| Services per cluster (iptables mode) | degrades past ~5,000; **IPVS mode** for more |
| etcd backing store | keep under **2 GB** (see §19) |
| Pod startup (image cached) | **1–5 s**; with image pull **10–60 s** |
| HPA reaction time | **15–60 s** (metrics window + stabilization) |
| Cluster autoscaler node provisioning | **1–5 min** |
| Readiness probe default period | 10 s |
| Graceful termination grace period | 30 s default |
| Sidecar overhead (Envoy) | **50–100 MB RAM, 0.1–0.5 vCPU**, +1–4 ms p99 per hop |
| Recommended requests:limits | Requests = p50 usage, limits = 2–4× (avoid CPU limits on latency-sensitive pods) |

**Consequence for design answers:** autoscaling takes **1–5 minutes end-to-end** (metrics → HPA → scheduler → node → image → readiness). Traffic spikes arrive in seconds. Therefore: keep **30–50% headroom**, use queues to absorb bursts, and pre-scale for known events. Saying this is the difference between "we'll autoscale" and an actual capacity plan.

---

## 23. Serialization, compression and protocol overhead

| Format | Encode/decode speed | Size vs JSON | Notes |
|---|---|---|---|
| JSON (text) | **100–500 MB/s** parse | 1× (baseline) | Human readable, schema-less |
| JSON (simdjson) | 1–3 GB/s | 1× | If parsing is your bottleneck |
| Protocol Buffers | **500 MB–2 GB/s** | **0.2–0.5×** | Schema, backward compatible, the RPC default |
| Avro | similar to protobuf | 0.2–0.4× | Schema registry; standard in Kafka pipelines |
| Thrift | similar | 0.2–0.5× | |
| MessagePack | 300 MB–1 GB/s | 0.6–0.8× | Schema-less binary |
| FlatBuffers / Cap'n Proto | **zero-copy reads (~0 parse)** | 0.5–1× | When you read a few fields from big messages |
| Parquet / ORC (columnar, at rest) | GB/s scan | **0.1–0.2×** | Analytics storage |

| Compression | Compress speed | Decompress speed | Ratio (text) |
|---|---|---|---|
| LZ4 | **400–800 MB/s** | **2–4 GB/s** | 2–3× |
| Snappy | 250–500 MB/s | 1–2 GB/s | 2–3× |
| Zstd (level 3) | **300–600 MB/s** | 1–1.5 GB/s | **3–5×** |
| Zstd (level 19) | 5–20 MB/s | 1 GB/s | 5–7× |
| Gzip (level 6) | 30–100 MB/s | 300–500 MB/s | 3–5× |
| Brotli (level 11) | 1–5 MB/s | 300–500 MB/s | **4–6×** (best for static web assets) |

**Protocol overhead:**

| Protocol | Per-request overhead | Latency vs REST/JSON |
|---|---|---|
| HTTP/1.1 + JSON | 200–800 B headers, one request per connection at a time | baseline |
| HTTP/2 + JSON | HPACK-compressed headers, multiplexed | −10–30% |
| gRPC (HTTP/2 + protobuf) | ~50–100 B | **2–5× lower latency and CPU**, 3–10× smaller payloads |
| GraphQL | Variable; solves over-fetching, risks N+1 | Add DataLoader batching or pay 10–100× DB queries |
| WebSocket | ~2–14 B per frame after handshake | Near-zero per message; ideal > 1 msg/s per client |
| Server-Sent Events | HTTP framing | One-way, auto-reconnect, simpler than WS |
| Long polling | Full HTTP request per event | Use only as a fallback |

**Rule to quote:** switching a chatty internal service from REST/JSON to gRPC/protobuf typically cuts p99 by **30–50%** and CPU by **2–3×**. Switching a public API for the same reason is usually not worth the ecosystem cost.

---

## 24. Probabilistic data structures

These earn a lot of credit because they turn "impossible memory" into "kilobytes."

| Structure | Memory | Error | Use case |
|---|---|---|---|
| **Bloom filter** | **~10 bits per element for 1% FPR** (`m/n = 1.44 × log₂(1/p)`); 1.2 MB per 1M elements | False positives only, never false negatives | "Have I seen this URL?", LSM SSTable skip |
| Counting Bloom / Cuckoo filter | ~1.5–2× Bloom | Supports deletes | Deletable membership |
| **HyperLogLog** | **12 KB** (Redis) for billions of items | **0.81% standard error** | Unique visitors, distinct counts |
| **Count-Min Sketch** | KBs–MBs | Overestimates | Heavy hitters, hot-key detection, rate limiting |
| **t-digest / DDSketch** | ~KBs | ~1% quantile error | p99 latency aggregation across hosts |
| **MinHash / SimHash** | 100s of bytes per doc | Jaccard estimate | Near-duplicate detection |
| **Consistent hashing ring** | 100–200 vnodes per node | ±5% balance | Sharding with minimal reshuffle: adding the Nth node moves only **1/N** of keys |

*Example to cite:* tracking unique daily visitors for 1M pages exactly needs ~GBs of sets; with HyperLogLog it is **12 KB × 1M = 12 GB**… so you also bucket, and for a single global counter it is 12 KB with 0.8% error. That trade is the kind of reasoning interviewers reward.

---

## 25. Availability, reliability and error budgets

| Availability | Downtime/year | Downtime/month | Downtime/week |
|---|---|---|---|
| 99% ("two nines") | 3.65 days | 7.3 h | 1.7 h |
| 99.9% ("three nines") | **8.77 h** | **43.8 min** | 10.1 min |
| 99.95% | 4.38 h | 21.9 min | 5 min |
| 99.99% ("four nines") | **52.6 min** | **4.4 min** | 1 min |
| 99.999% ("five nines") | **5.26 min** | 26 s | 6 s |

**Composition math (the part candidates miss):**
- **Serial dependencies multiply:** a request touching 5 services at 99.9% each ⇒ 0.999⁵ = **99.5%** (43 h/year). This is why you need redundancy *and* graceful degradation.
- **Parallel redundancy:** two independent 99% components in active-active ⇒ 1 − 0.01² = **99.99%** — if failures are truly independent (they rarely are: shared config, shared deploy, shared DNS).
- **A single AZ** typically buys ~99.9%; **multi-AZ** ~99.99%; **multi-region** is what you need for 99.999% — at 2× cost and a large consistency tax.

| Reliability figure | Typical value |
|---|---|
| Annual failure rate, commodity server | **2–5%** (in a 1,000-node fleet: ~1 failure every 3–7 days) |
| Disk AFR | 1–3% |
| Rack failure | ~1/year per rack |
| AZ outage | a few per year across a large cloud |
| Region outage | rare, but plan for it (hours) |
| MTTR target | **< 30 min** (detect < 5 min, mitigate < 15 min) |
| Deploy-related incidents | **~50–70%** of all incidents → canary, feature flags, fast rollback (< 5 min) |

**SLO practice:** pick an SLO (e.g. 99.9% of requests < 300 ms over 28 days), derive the **error budget** (0.1% of 100M requests = 100,000 failed requests/month), and spend it deliberately. Retries with **exponential backoff + full jitter**, **circuit breakers** (open after ~50% errors in a 10 s window, half-open probe after 5–30 s), timeouts set at **p99.9 × 1.5**, and bulkheads are the standard toolkit.

**Retry math to be careful with:** naive retries multiply load during an incident. If every client retries 3×, a degraded service sees **4× traffic** at exactly the worst moment. Quote *retry budgets* (cap retries at ~10% of requests) and *jitter*.

---

## 26. Cost figures of merit

Money is a figure of merit too, and mentioning it distinguishes senior candidates.

| Resource | Typical cloud price (2025-ish, on-demand US) |
|---|---|
| vCPU-hour (general purpose) | **$0.03–0.05** (≈ $25–40/month per vCPU) |
| GB RAM-hour | $0.004–0.006 (≈ $3–5/month per GB) |
| 16 vCPU / 64 GB instance | **~$400–600/month** on-demand; **~$150–250 with 3-year commitment** |
| Spot instances | **60–90% discount**, can be reclaimed in 2 minutes |
| EBS gp3 | **$0.08/GB-month** + IOPS/throughput above baseline |
| S3 Standard | **$0.023/GB-month** (~$23/TB-month) |
| S3 Glacier Deep Archive | $0.00099/GB-month (~$1/TB-month) |
| **Internet egress** | **$0.05–0.09/GB** — the line item that surprises everyone ($90/TB) |
| **Cross-AZ traffic** | **$0.01–0.02/GB each direction** |
| CDN egress | $0.02–0.085/GB (cheaper than origin egress) |
| RDS/managed DB premium | **~2× the raw instance cost** |
| DynamoDB on-demand | **$1.25 per million writes**, **$0.25 per million reads**, $0.25/GB-month |
| Managed Kafka (MSK) | ~$0.05–0.25 per broker-hour + storage |
| Lambda | $0.20/1M requests + $16.67 per million GB-seconds |
| Load balancer | ~$16–25/month + traffic-based units |

**Cost sentences that land:** "Serving 1 PB/month of video from origin at $0.085/GB is **$85,000/month** — a CDN at 95% offload plus committed pricing cuts that by 5–10×." Or: "That microservice chatter is 3 cross-AZ calls per request; at 10k rps and 5 KB per call that's ~1.3 PB/month = **$25k/month in cross-AZ fees alone**."

---

## 27. Six worked capacity estimates

### 27.1 URL shortener (Bitly-scale)

```
Assumptions: 100M new URLs/day, 10:1 read:write
Writes  : 100M / 86,400        ≈ 1,160 writes/s (peak 3×  ≈ 3,500/s)
Reads   : 1B  / 86,400         ≈ 11,600 reads/s (peak     ≈ 35,000/s)
Storage : 500 B/record × 100M  = 50 GB/day = 18 TB/year
Keyspace: base62, 7 chars      = 62⁷ ≈ 3.5 trillion codes
```
**Design implications:** 3,500 writes/s exceeds one comfortable Postgres primary's headroom for a growing table, and 18 TB/year forces sharding by hash of the short code. 35,000 reads/s is a **cache problem, not a database problem** — with a 95% hit rate Redis serves 33k/s (well within one cluster) and the DB sees only ~1,700/s. Counters/analytics go to a stream, not to a synchronous `UPDATE` (which would create a hot row).

### 27.2 Twitter-like feed

```
500M tweets/day       → 5,800 writes/s, peak 15,000/s
200M DAU × 20 reads   → 4B reads/day = 46,000 reads/s, peak 150,000/s
Tweet payload         ≈ 300 B text + metadata → 150 GB/day text, ~30 TB/day with media
Average fanout        ≈ 200 followers → 5,800 × 200 = 1.2M timeline writes/s
```
**Design implications:** pure fanout-on-write costs 1.2M writes/s into a timeline store (feasible with Redis lists: 1.2M ops/s = ~10–20 Redis shards), but a celebrity with 100M followers would need 100M writes for one tweet — so you use the **hybrid**: fanout-on-write for normal users, fanout-on-read (merge at query time) for accounts above ~**100k followers**. Timeline cache: 200M users × 800 tweet IDs × 8 B ≈ **1.3 TB** of Redis — roughly 30–60 nodes.

### 27.3 Chat / messaging (WhatsApp-scale)

```
100B messages/day     → 1.2M messages/s, peak 3M/s
500M concurrent connections
Per node: 200k WebSockets → 2,500 connection nodes
Message size ~200 B   → 20 TB/day, 7.3 PB/year (before replication)
```
**Design implications:** connections dominate, not CPU. You need a connection tier (Go/Erlang, 200k–1M sockets per node) separate from a message tier, a session registry (which user is on which node — Redis, 500M entries × ~100 B = **50 GB**), and Cassandra/Scylla for message history (1.2M writes/s ÷ 100k writes/s per Scylla node ≈ **12–30 nodes with RF 3**). Kafka between the tiers absorbs bursts at ~1.2M msgs/s = **2–5 brokers of headroom, 120+ partitions**.

### 27.4 Video streaming (Netflix/YouTube-scale)

```
Bitrates: 480p 1 Mbps | 720p 2.5 Mbps | 1080p 5 Mbps | 4K 15–25 Mbps
10M concurrent viewers × 5 Mbps = 50 Tbps
Storage: 1 h of 1080p ≈ 2.25 GB; 5 renditions ≈ 10 GB per hour of content
Transcoding: ~1–5× realtime per CPU core → 1 h video ≈ 0.5–2 core-hours per rendition
```
**Design implications:** 50 Tbps is **impossible from origin** (a 100 Gbps datacenter uplink is 0.2% of it), so the answer is a CDN/edge-cache fleet — thousands of PoPs, 95%+ hit rate, HLS/DASH segments of **2–10 s**, and pre-positioning popular content. Origin only serves the long tail.

### 27.5 Ride-hailing / location tracking

```
1M active drivers, location ping every 4 s → 250,000 writes/s
Payload ~100 B → 25 MB/s, 2 TB/day raw
Nearby-driver query: p99 < 100 ms, radius 5 km
```
**Design implications:** 250k writes/s rules out a relational primary (10–20k/s). Use an in-memory geospatial index — Redis GEO / S2 cells / Uber's H3 hexagons — keyed by cell ID, with **last-write-wins** and TTL. History goes to Kafka → Cassandra/S3 asynchronously. Quote the resolution choice: H3 resolution 8 ≈ 0.7 km² hexagons, so a 5 km radius touches ~100 cells → ~100 Redis lookups ≈ 5–10 ms with pipelining.

### 27.6 E-commerce checkout (correctness over scale)

```
1M orders/day → 12 orders/s average, 100–500/s on Black Friday
Inventory decrement must be exact; payment must be idempotent
```
**Design implications:** this is the case where you *should not* reach for eventual consistency. 500 TPS is trivially within a single PostgreSQL primary (5k–20k TPS), so use transactions, `SELECT … FOR UPDATE` or optimistic concurrency with a version column, an **idempotency key** per payment request (stored with a 24 h TTL), and the **outbox pattern** (write the event in the same transaction, ship via CDC with 10 ms–1 s lag) rather than a distributed transaction. Recognizing that the scale does *not* require exotic architecture is itself a senior signal.

---

## 28. The one-page cheat sheet

**Latency**
`L1 1 ns · RAM 100 ns · NVMe 50 µs · same-DC RTT 0.5 ms · cross-AZ 1 ms · US→EU 90 ms · HDD seek 8 ms`

**Throughput per box**
`App server 1k–5k rps · NGINX 50k–500k rps · Redis 100k ops/s (1M pipelined) · Postgres 20k reads/s, 10k writes/s · MySQL 50k reads/s · Cassandra 20k writes/s · Scylla 200k+ · Elasticsearch 20k docs/s indexing · Kafka broker 100+ MB/s · S3 3,500 writes/s per prefix`

**Capacity thresholds**
`Postgres partition at 100M rows, shard at 1–2 TB · MySQL shard at 500 GB–1 TB · Redis shard at 25–50 GB · Cassandra partition < 100 MB, node 1–2 TB · Dynamo partition 3,000 RCU / 1,000 WCU / 10 GB, item 400 KB · ES shard 10–50 GB, heap ≤ 31 GB · Kafka ≤ 4,000 partitions/broker, message ≤ 1 MB · Mongo doc ≤ 16 MB · etcd ≤ 8 GB · Prometheus ≤ 10M series`

**Conversions**
`1M/day ≈ 12 rps · 1B/day ≈ 11.6k rps · peak = 3× average · 86,400 s/day · 31.5M s/year · 1 ms RTT per 100 km`

**Laws**
`Concurrency = rps × latency (Little) · Queue delay explodes past 70–80% utilization · 5 serial 99.9% services = 99.5%`

**Design ladder (say it in this order)**
`Index → cache → read replica → CDN → async/queue → partition → archive → shard → multi-region`

---

## Closing: how to actually use these in the room

Nobody expects you to recite this table. What a strong interviewer wants to hear is a **short chain of numbers that leads to a decision**:

> *"20M DAU, 10 writes each, so 200M writes/day ≈ 2,300/s, peak ~7,000/s. Each record is ~500 bytes, so 100 GB/day, 36 TB/year. 7,000 writes/s is above one Postgres primary's comfort zone of 5–10k, and 36 TB is far past the 1–2 TB I'd want on one node, so I'll shard by user_id into, say, 16 shards — that's ~440 writes/s and ~2 TB each, which leaves room to double before resharding. Reads are 20:1, so 140k reads/s — that's a cache tier: Redis at a 95% hit rate serves 133k/s across ~4–6 shards and the databases see only 7k/s."*

That paragraph contains maybe a dozen of the numbers above. It takes ninety seconds. It demonstrates estimation, capacity planning, technology knowledge and an awareness of headroom — which is, more or less, the entire rubric.

Three habits to practice:

1. **Always state the assumption with the number.** "Assuming 1 KB records" costs you two seconds and buys you the right to be wrong.
2. **Round aggressively.** 86,400 is 100,000. 365 is 400. Nobody wants to watch you do long division.
3. **Know the thresholds, not just the maxima.** The valuable knowledge is not "Postgres tables can be 32 TB," it is "I'd partition at 100 GB and shard at 1 TB" — that is the number that changes the design on the whiteboard.

Bookmark this, benchmark your own systems against it, and update the numbers as hardware moves — because it does. NVMe made "disk is slow" half-wrong; KRaft made "Kafka can't do a million partitions" wrong; ZGC made "JVM means 200 ms pauses" wrong. The figures of merit are a living document; the habit of reaching for them is the permanent skill.
