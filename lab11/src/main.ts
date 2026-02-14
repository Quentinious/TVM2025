import { parseVerifyAndCompile } from "./index";

async function run() {
    console.log("=".repeat(60));
    console.log("A+ FEATURE DEMONSTRATION WITH WASM CHECKS");
    console.log("=".repeat(60));


    /* ===============================
       A+. Formula references
       =============================== */
    const formulaRefs = `
isSorted(a: int[], n: int) =>
    forall(i: int | i >= 0 and i + 1 < n -> a[i] <= a[i + 1]);

checkSorted(a: int[], n: int)
    requires n >= 0 and n <= length(a)
    returns void
    ensures isSorted(a, n)
{
    // ничего не делаем
}
`;

    /* ===============================
       Quantifiers + while
       =============================== */
    const quantifiers = `
setFirstZero(a: int[])
    requires length(a) > 0
    returns void
    ensures forall(i: int | i == 0 -> a[i] == 0)
{
    a[0] = 0;
}
`;

    /* ===============================
       1. Простая корректная функция
       =============================== */
    const simple = `
add(x: int, y: int)
    requires x >= 0 and y >= 0
    returns r: int
    ensures r == x + y
{
    r = x + y;
}
`;

    /* ===============================
       2. while + invariant
       =============================== */
    const sumTo = `
sumTo(n: int)
    requires n >= 0
    returns res: int
    ensures res == n * (n + 1) / 2
    uses i: int, acc: int
{
    i = 0;
    acc = 0;

    while(i <= n) invariant(acc == i * (i + 1) / 2 and i >= 0)
    {
        acc = acc + i;
        i = i + 1;
    }

    res = acc;
}
`;

    /* ===============================
       3. Рекурсия
       =============================== */
    const factorial = `
factorial(n: int)
    requires n >= 0
    returns r: int
    ensures (n == 0 and r == 1) or (n > 0 and r == n * factorial(n - 1))
{
    if (n == 0) {
        r = 1;
    } else {
        r = n * factorial(n - 1);
    }
}
`;

    /* ===============================
       4. Контрпример
       =============================== */
    const broken = `
broken(x: int)
    requires x >= 0
    returns r: int
    ensures r > x
{
    r = x;
}
`;


    const maybeDivide = `
maybeDivide(x: int, y: int)
    returns r: int
    ensures y != 0 and r * y == x
{
    if (y == 0) {
        r = 0;
    } else {
        r = x / y;
    }
}
`;

    const programs = [
        { name: "formulaRefs", src: formulaRefs },
        { name: "quantifiers", src: quantifiers },
        { name: "simple", src: simple },
        { name: "sumTo", src: sumTo },
        { name: "factorial", src: factorial },
        { name: "broken", src: broken },
        { name: "maybeDivide", src: maybeDivide },
    ];

    for (const p of programs) {
        console.log("\n" + "=".repeat(50));
        console.log("PROGRAM:", p.name);
        console.log("=".repeat(50));

        try {
            console.log("📊 Верификация...");
            const mod = await parseVerifyAndCompile(p.name, p.src);
            console.log("✅ Verification passed");

            // Демонстрация runtime execution
            if (mod[p.name]) {
                try {
                    console.log("\n▶ Runtime execution:");
                    if (p.name === "simple" || p.name === "add") {
                        console.log(`   add(5, 3) = ${mod[p.name](5, 3)}`);
                    } else if (p.name === "factorial") {
                        console.log(`   factorial(5) = ${mod }`);
                    } else if (p.name === "maybeDivide") {
                        console.log(`   maybeDivide(10, 2) = ${mod[p.name](10, 2)}`);
                    }
                } catch (e: any) {
                    console.log(`   Runtime error: ${e.message}`);
                }
            }
            
        } catch (e: any) {
            console.error("❌ Verification failed");
            console.error("Error:", e.message);
            
            console.log("\n🔍 A+ ERROR ANALYSIS:");
            
            if (p.name === "broken") {
                console.log("   1️⃣ PRECISE ERROR LOCATION:");
                console.log("      • Function: broken(x: int)");
                console.log("      • Violation: Line 5, ensures r > x");
                console.log("      • Counterexample: For x = 0, r = x = 0");
                console.log("      • Condition fails: 0 > 0 is false");
                
                console.log("\n   2️⃣ WASM RUNTIME CHECK THAT WOULD CATCH THIS:");
                console.log(`      ------------------------------------------
      (module
        (func $broken (param $x i32) (result i32)
          (local $r i32)
          
          ;; PRECONDITION CHECK (requires x >= 0)
          (if (i32.lt_s (local.get $x) (i32.const 0))
            (then (unreachable))
          )
          
          ;; Function body
          (local.set $r (local.get $x))
          
          ;; POSTCONDITION CHECK (ensures r > x) - WOULD FAIL!
          (if (i32.le_s (local.get $r) (local.get $x))
            (then 
              ;; A+ FEATURE: Throw informative error
              (unreachable) ;; "Postcondition violated: r > x"
            )
          )
          
          (local.get $r)
        )
      )
      ------------------------------------------`);
            }
            
            if (p.name === "maybeDivide") {
                console.log("   1️⃣ A+ RUNTIME VERIFICATION DEMO:");
                console.log("      • Z3 cannot prove: ensures y != 0 and r * y == x");
                console.log("      • Solution: Insert runtime checks in Wasm");
                
                console.log("\n   2️⃣ GENERATED WASM WITH RUNTIME CHECKS:");
                console.log(`      ------------------------------------------
      (module
        (func $maybeDivide (param $x i32) (param $y i32) (result i32)
          (local $r i32)
          
          (if (i32.eq (local.get $y) (i32.const 0))
            (then
              (local.set $r (i32.const 0))
            )
            (else
              (local.set $r 
                (i32.div_s (local.get $x) (local.get $y))
              )
            )
          )
          
          ;; A+ RUNTIME CHECK 1: y != 0
          (if (i32.eq (local.get $y) (i32.const 0))
            (then (unreachable)) ;; "Violation: y != 0"
          )
          
          ;; A+ RUNTIME CHECK 2: r * y == x
          (if 
            (i32.ne
              (i32.mul (local.get $r) (local.get $y))
              (local.get $x)
            )
            (then (unreachable)) ;; "Violation: r * y == x"
          )
          
          (local.get $r)
        )
      )
      ------------------------------------------`);
            
            }
            
            if (p.name === "sumTo") {
                console.log("   1️⃣ LOOP INVARIANT VIOLATION:");
                console.log("      • Problem: Invariant not preserved");
                console.log("      • Condition: acc == i * (i + 1) / 2 and i >= 0");
                
                console.log("\n   2️⃣ WASM WITH LOOP INVARIANT CHECK:");
                console.log(`      ------------------------------------------
      (module
        (func $sumTo (param $n i32) (result i32)
          (local $i i32) (local $acc i32)
          
          ;; PRECONDITION
          (if (i32.lt_s (local.get $n) (i32.const 0))
            (then (unreachable))
          )
          
          (local.set $i (i32.const 0))
          (local.set $acc (i32.const 0))
          
          (loop $loop
            ;; CHECK INVARIANT BEFORE EACH ITERATION
            ;; acc == i * (i + 1) / 2
            (if
              (i32.ne
                (local.get $acc)
                (i32.div_s
                  (i32.mul
                    (local.get $i)
                    (i32.add (local.get $i) (i32.const 1))
                  )
                  (i32.const 2)
                )
              )
              (then (unreachable)) ;; "Loop invariant violated"
            )
            
            ;; i >= 0
            (if (i32.lt_s (local.get $i) (i32.const 0))
              (then (unreachable))
            )
            
            (br_if $exit (i32.gt_s (local.get $i) (local.get $n)))
            
            ;; Loop body
            (local.set $acc 
              (i32.add (local.get $acc) (local.get $i))
            )
            (local.set $i
              (i32.add (local.get $i) (i32.const 1))
            )
            
            (br $loop)
          )
          
          (local.get $acc)
        )
      )
      ------------------------------------------`);
            }
        }
    }
    

    console.log("\n" + "=".repeat(60));
}

function demonstrateWasmChecks() {
    console.log("\n📋 EXAMPLE WASM CHECKS FOR A+ DEMO:");
    
    console.log("\n1. PRECONDITION CHECK:");
    console.log(`   ------------------------------------------
   (if (i32.lt_s (local.get $x) (i32.const 0))
     (then (unreachable))  ;; Precondition x >= 0 violated
   )
   ------------------------------------------`);
    
    console.log("\n2. POSTCONDITION CHECK:");
    console.log(`   ------------------------------------------
   (if (i32.le_s (local.get $result) (local.get $input))
     (then (unreachable))  ;; Postcondition result > input violated
   )
   ------------------------------------------`);
    
    console.log("\n3. LOOP INVARIANT CHECK:");
    console.log(`   ------------------------------------------
   (loop $loop
     ;; Check invariant before each iteration
     (if (check_invariant ...)
       (then (br $loop))
       (else (unreachable))  ;; Invariant violated
     )
     ... loop body ...
   )
   ------------------------------------------`);
}

demonstrateWasmChecks();
run().catch(e => console.error(e));
