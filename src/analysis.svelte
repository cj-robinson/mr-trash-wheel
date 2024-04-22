<script>
    import { onMount } from 'svelte';
  
    let objects = [];
    let windowHeight = 0;
    let width;
    let height;
    const margin = { top: 10, bottom: 10, left: 10, right: 10};

    const objectConfigs = [
		{ type: 'Waterbottles', number: 1981, color: 'blue' },
		{ type: 'Cigarette Butts', number: 18656, color: 'black' },
		{ type: 'Plastic Bags', number: 867, color: 'green' },
		{ type: 'Polystyrene Items', number: 1462, color: 'purple' },
		{ type: 'Glass Bottles', number: 21, color: 'grey' },
		{ type: 'Wrappers', number: 1427, color: 'yellow' },
		{ type: 'Sports Balls', number: 13, color: 'orange' },
	];

    let columns = 200;
    let cellWidth = 10;
    let cellHeight = 10;

	onMount(() => {

	  initObjects();

	});

    function initObjects() {
        objects = objectConfigs.flatMap(config => {
            return Array.from({ length: config.number }, (_, i) => {
                return {
                    type: config.type,
                    color: config.color
                }
            })
        })
        calculateGridPositions();
        console.log(objects);
    };
      
  
    function calculateGridPositions() {
      let yStart = windowHeight + 50; // Starting below the viewport height
      let xStart = 10;
      objectConfigs.forEach(config => {
        let index = 0;
        objects.filter(obj => obj.type === config.type).forEach(obj => {
          let row = Math.floor(index / columns);
          let col = index % columns;
          obj.finalX = xStart + col * cellWidth;
          obj.finalY = yStart + row * cellHeight;
          index++;
        });
        yStart += (Math.ceil(config.number / columns) + 1) * cellHeight; // Move to next block
      });
    }

  </script>
  
<style>
    .chart-container {
        width: 99%;
        height: 100%;
        display: flex;
        flex-wrap: wrap;
        text-align: center;
        margin-left: 2px
    }
	.shape {
		width: 5px;
		height: 5px;
		z-index: 1000000;
        margin: 1px;
		border-radius: 25px;
	}
</style>
  
<div style="text-align:center"><h1>Total Garbage Count</h1></div>
<div style="text-align:center">That's over 6,400 lb of trash. All in a day's work.</div>

<div class='chart-container'>
    {#each objectConfigs as config}
        <div><h3>{config.number.toLocaleString()} {config.type}</h3></div>
        <div class='chart-container'>
            {#each Array.from({ length: config.number }) as _}
                <div class="shape" style="background-color:{config.color};"></div>
            {/each}
        </div>
    {/each}
</div>