<script>
	import { onMount } from 'svelte';
    export let steps = [];

	let objects = [];
	let windowHeight = 0;
	let windowWidth = 0;
	let initialScrollY = 0;
	let minInitialOffset = Number.MAX_VALUE;
	let maxInitialOffset = Number.MIN_VALUE;
	let currentHour = 0;
	let squareBounds = { top: 0, bottom: 0 };
	let zIndex = 0;
  
	const objectConfigs = [
		{ type: 'waterbottle', number: 1981, imageSrc: 'water_bottle.svg', step: 4 },
		{ type: 'cig', number: 18656, imageSrc: 'water_bottle.svg', step: 5 },
		{ type: 'sportsballs', number: 13, imageSrc: 'water_bottle.svg', step: 6 },
		{ type: 'glassbottles', number: 21, imageSrc: 'water_bottle.svg', step: 6 },
		{ type: 'plasticbags', number: 867, imageSrc: 'water_bottle.svg', step: 6 },
		{ type: 'wrappers', number: 1427, imageSrc: 'water_bottle.svg', step: 6 },
		{ type: 'plastics', number: 1462, imageSrc: 'water_bottle.svg', step: 6},
	];


	let columns = 100;  // This can be adjusted based on the screen width or desired grid density
	let cellWidth = 10;
	let cellHeight = 10;

	onMount(() => {
	  windowHeight = window.innerHeight;
	  windowWidth = window.innerWidth;
	  initialScrollY = window.scrollY;
	  initObjects();

	  function throttle(fn, wait) {
			let last = 0;
			return (...args) => {
				const now = new Date();
				if (now - last > wait) {
					last = now;
					fn(...args);
				}
			};
		}

	window.addEventListener('scroll', throttle(handleScroll, 100));
	  return () => {
		window.removeEventListener('scroll', handleScroll);
	  };
	});



	function initObjects() {
        const stepHeight = windowHeight * 3;
		minInitialOffset = windowHeight * 22;
		maxInitialOffset = windowHeight * 40;

		objects = objectConfigs.flatMap(config => {

			return Array.from({ length: config.number }, (_, i) => {
			let stepIndex = steps.findIndex((_, index) => index === config.step);
			let earlyAppearanceOffset = 0;
			let originalHorizontal =(windowWidth / 2 - 55) + Math.random() * 85

			if (i < 1) { // Assuming you want the first two objects of each type to appear earlier
				earlyAppearanceOffset = stepHeight * stepIndex + (stepHeight * 0.1); // Smaller offset for earlier appearance
				if(config.type === 'sportsballs') {originalHorizontal = (windowWidth / 2 - 55)
				} else if (config.type === 'glassbottles') {originalHorizontal = (windowWidth / 2 - 55) + .25 * 85
				} else if (config.type === 'plastics') {originalHorizontal = (windowWidth / 2 - 55) + .5 * 85
				} else if (config.type === 'wrappers') {originalHorizontal = (windowWidth / 2 - 55) + .75 * 85
				} else if (config.type === 'plasticbags') {originalHorizontal = (windowWidth / 2 - 55) + 85
				}
			} else {
				earlyAppearanceOffset = minInitialOffset + Math.random() * (maxInitialOffset - minInitialOffset);
			}

			return {
				id: `${config.type}-${i}`,
				type: config.type,
				imageSrc: config.imageSrc,
				initialOffset: earlyAppearanceOffset,
				horizontal: originalHorizontal,
				originalHorizontal: originalHorizontal
			};
			});
		});

	}

	function handleScroll() {
		const scrollY = window.scrollY;
		currentHour = Math.floor((scrollY - minInitialOffset) / (maxInitialOffset - minInitialOffset) *23) % 23 + 1;

		// Normal scroll behavior
		objects = objects.map(obj => {
		let newOffset = obj.initialOffset - scrollY;
		return {
			...obj,
			horizontal: obj.originalHorizontal,
			offset: newOffset <= squareBounds.top ? squareBounds.top : newOffset
			};
		});
		}

</script>
  
  
<style>
	.shape {
		width: 5px;
		height: 5px;
		border-radius: 25px;
		background-color: green;
		position: absolute;
		z-index: -1;
	}
	.center-square {
		width: 150px;
		height: 150px;
		top: 7%;
		left: 50%; /* Center horizontally in the viewport */
		transform: translate(-50%);
		position: sticky;
		background-image: url("/MrTrashWheel.png");
		background-size: 100%;
		background-repeat: no-repeat;
		z-index: 100000;
	}
	.trash-wrapper {
		width: 100px;
		top: 10%;
		position: sticky;
	}
	.hour-counter {
		width: 20%;
		text-align: center;
		background-color: #f0f0f0;
		padding: 10px;
		left: 10%;
		top: 50%;
		box-shadow: 0 2px 5px rgba(0,0,0,0.2);
		position: sticky;
	}
</style>

<div style="height:{maxInitialOffset}px;">
	{#if window.scrollY >= minInitialOffset && window.scrollY <= maxInitialOffset}
	<div class="hour-counter" style="z-index: 10; right: 10%;">
		Current Hour: {currentHour}:00
	</div>
	{/if}

	<div class="center-square"></div>

	<div class="trash-wrapper"> 
		{#each objects as { id, offset, horizontal, type}}
		{#if type === 'waterbottle'}
			<div class="shape" style="background-color: blue; top: {offset}px; left: {horizontal}px; z-index: {zIndex};" />
		{:else if type === 'plasticbags'}
			<div class="shape" style="background-color: green; top: {offset}px; left: {horizontal}px;  z-index: {zIndex};" />
		{:else if type === 'plastics'}
			<div class="shape" style="background-color: purple; top: {offset}px; left: {horizontal}px;  z-index: {zIndex};" />
		{:else if type === 'wrappers'}
			<div class="shape" style="background-color: yellow; top: {offset}px; left: {horizontal}px;  z-index: {zIndex};" />
		{:else if type === 'sportsballs'}
			<div class="shape" style="background-color: orange; top: {offset}px; left: {horizontal}px;  z-index: {zIndex};" />
		{:else if type === 'cig'}
			<div class="shape" style="background-color: black; top: {offset}px; left: {horizontal}px;  z-index: {zIndex};" />
		{:else if type === 'glassbottles'}
			<div class="shape" style="background-color: grey; top: {offset}px; left: {horizontal}px;  z-index: {zIndex};" />
		{/if}
		{/each}
	</div>
</div>