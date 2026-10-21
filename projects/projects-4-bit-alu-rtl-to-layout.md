
# 🧮 4-bit ALU: RTL to Layout


---


I am learning digital design with an ASIC-first approach. Instead of reading about the chip design flow, I wanted to take one small circuit through all of it myself: writing the RTL, verifying it, synthesizing it into real standard cells, checking its timing, and then placing and routing it into a physical layout. A 4-bit ALU felt like the right size for this. It is small enough that I can understand every gate, but it still has an adder, so there is a real critical path to look at.


All the tools I used are open source. Yosys for synthesis, OpenROAD for timing and physical design, and the Nangate45 library as the standard cell library. I ran everything inside the OpenROAD-flow-scripts Docker container on my Mac.


## What the ALU does


The ALU takes two 4-bit inputs, `a` and `b`, and a 2-bit `op` that selects the operation. It produces a 4-bit result `y` and a `carry_out`.

- `op = 00`: addition. `y` is the lower 4 bits of `a + b`, and `carry_out` is the 5th bit.
- `op = 01`: bitwise AND
- `op = 10`: bitwise OR
- `op = 11`: bitwise XOR

For the logic operations, `carry_out` is always 0.


## Writing the RTL


I wrote the ALU in Verilog as a single `always @(*)` block with a `case` statement on `op`. Two things mattered here.


First, every output has to be assigned on every path. If I forget to assign `y` in some branch, the synthesis tool assumes the old value should be held, and it infers a latch. That is not what a combinational circuit should have. So I gave all outputs a default value at the top of the block.


Second, the carry. I used a 5-bit temporary sum, so the carry simply becomes bit 4 of that sum. Writing `+` in Verilog does not mean I get a ripple-carry adder in hardware. The synthesis tool decides the actual adder structure.


Also, a `case` statement in combinational logic is just a multiplexer. All four operations are computed in parallel, and `op` selects which one goes to the output.


Yosys confirmed there were no latches or flip-flops in the design.


## Testing it


Since the inputs are only 10 bits wide in total, I could test every single combination. The testbench loops over all values of `a`, `b` and `op`, which gives 1,024 cases. For each case, a task computes the expected result, and another task compares it with the ALU output using `!==`, so that `x` and `z` values also count as failures. On any mismatch, the simulation stops with `$fatal`.


All 1,024 cases passed. But a passing testbench only means something if it can actually fail. So I broke the RTL on purpose and changed XOR into OR. The testbench caught it at `a = 0001, b = 0001, op = 11`, after about 71 passing cases. Then I restored the correct RTL.


## Synthesis: from Verilog to standard cells


Before mapping to a library, Yosys showed 11 high-level cells (things like `$add`, `$and`, `$pmux`). A generic gate-level synthesis turned that into 41 simple gates.


Then I mapped it to the actual Nangate45 standard cells:


```bash
LIB=/OpenROAD-flow-scripts/flow/platforms/nangate45/lib/NangateOpenCellLibrary_typical.lib
yosys -p "
  read_verilog alu4.v
  hierarchy -check -top alu4
  synth -top alu4 -noabc
  dfflibmap -liberty $LIB
  abc -liberty $LIB
  clean
  stat -liberty $LIB
  write_verilog -noattr alu4_mapped.v
"
```


The result was 29 standard cells with a total cell area of 35.378 µm². The cells were mostly compound gates like AOI and OAI, plus five XNORs. The mapped netlist does not look like "an adder, three logic blocks and a mux", because ABC restructures the logic to fit the library cells. Also, 35.378 µm² is just the sum of the cell footprints. It is not the area of the chip.


## Timing before layout


The ALU has no clock, so there is nothing to time against by default. To run static timing analysis, I created a virtual clock with a 1 ns period. Inputs are launched and outputs are captured with respect to this clock. I also set a 50 ps input slew and a 0.01 pF load on the outputs.


The worst path was from `b[1]` to `y[3]`, through five gates:


XNOR2 → OAI21 → AOI21 → XNOR2 → OAI221


It took about 0.21 ns, which leaves +0.79 ns of slack. The other outputs were faster: `y[2]` at 0.18 ns, `carry_out` at 0.16 ns, `y[1]` at 0.14 ns and `y[0]` at 0.12 ns. This makes sense. The higher result bits depend on the carry coming up from the lower bits.


One thing I want to be careful about: this does not tell me the maximum frequency of a chip. The 1 ns clock is something I made up as a reference. This is just a way to measure how long the combinational path takes.


## Floorplan


Now the physical part. A floorplan defines the die (the whole chip area) and the core (the area where cells are placed). I asked for a 20×20 µm die with the core from (2, 2) to (18, 18) µm. OpenROAD snapped the core to the placement grid, so it actually became (2.09, 2.8) to (17.86, 16.8) µm, which is 220.78 µm².


The core is divided into rows of placement sites. Here there are 10 rows, each with 83 sites, and each site is 0.19 × 1.4 µm. Every alternate row is flipped vertically (marked `FS`) so that neighbouring rows can share their power rails.


With 35.378 µm² of cells in 220.78 µm² of core, the utilization is about 16%. That is low, but this is a tiny design.


## Placement


Placement happens in two steps. Global placement spreads the cells out to minimise wire length while keeping density under control. It ran for 369 iterations and ended with an estimated wire length (HPWL) of about 221.6 µm. Global placement allows cells to overlap, so detailed placement then snaps every cell onto a legal site. It fixed 8 overlaps across 4 cells, and the wire length went up to 249.9 µm.


The input and output pins were also placed on the edges of the die, all 15 of them.


When I looked at the layout in the GUI, the five gates of the critical path were not sitting next to each other. The placer optimises all the nets together, not just the critical path, and I did not turn on timing-driven placement.


I also made a mistake with file names here. I kept saving the placed design as `alu4_floorplan.odb`, so my routing script failed when it looked for `alu4_placed.odb`. I changed the script to load the right file. For the next project, I will use a separate file name for each stage.


## Routing


Routing also happens in two steps. Global routing does not draw any wires. It divides the chip into a grid and decides which regions and metal layers each net should pass through. These are saved as route guides. I tried to view the guides in the GUI, but the command I tried does not exist in my OpenROAD build, so I moved on.


Detailed routing then draws the real wires and vias inside those guides. It finished with 0 violations. The total wire length was 287 µm, 153 µm on metal2 and 134 µm on metal3, with 230 vias.


This is not a chip that can be manufactured. There is no power grid yet, and 0 violations from the router is not the same as a full DRC and LVS signoff.


## Timing after routing


After routing, the wires have real resistance and capacitance. I extracted these parasitics (37 nets, 180 resistor segments, 300 coupling capacitors) and ran timing analysis again with the same constraints as before.


The critical path was the same: `b[1]` to `y[3]` at about 0.21 ns, with +0.79 ns of slack.


But this does not mean that routing had no effect. The report only shows two decimal places, so any difference smaller than 10 ps simply does not show up. I tried to increase the precision with `sta::set_report_default_digits`, but that command does not exist in my build.


## What's next


I will rerun both the pre-route and the post-route timing with `report_checks -digits 5`, using exactly the same constraints, so that I can actually compare them. After that, I will review the whole project and move on to sequential logic, where clocks, flip-flops, setup and hold time come into the picture.

