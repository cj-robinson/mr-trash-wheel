<script>
	import Visualization from './collection.svelte';
    import Scrolly from "./Scrolly.svelte";
	import Analysis from "./analysis.svelte";
	let conclusionVisible = false;
    let value;

	const steps = [
		"<p>Welcome to the Jones Falls stream in Baltimore, Maryland. </p><p> Meet Mr. Trash Wheel®",
		"<p>Mr. Trash Wheel® has a simple job. And that job is to consume garbage.</p><p> He does that by using the water's current or his solar panels to rake through debris. It's pretty amazing to see.",
		"<p>How much trash does a guy like this filter? Here comes garbage now.</p>",
		"<p>This is one plastic bottle.</p>",
		"<p>There goes a cigarette butt.</p>",
		"<p>Anyone missing a ball? A glass bottle? Polyethylene? An old wrapper?</p>",
		"<p>Let's see how much comes through in a typical day's work, which we'll track as 24 hours.</p>"
	];

	function updateConclusionVisibility() {
	  const conclusion = document.querySelector('.conclusion');
	  const visualizationEnd = document.querySelector('.spacer:last-of-type').getBoundingClientRect().top;
	  conclusionVisible = visualizationEnd < 0;
	}
  
	import { onMount } from 'svelte';
	onMount(() => {
	  window.addEventListener('scroll', updateConclusionVisibility);
	  return () => {
		window.removeEventListener('scroll', updateConclusionVisibility);
	  };
	});
  </script>
  
  <style>
	:global(body) {
		overflow-x: hidden;
	}
	.article-section {
	  padding: 20px;
	  max-width: 800px;
	  margin: 50px auto;
	}
  
	.step {
		height: 300vh;
		display: flex;
		place-items: center;
		justify-content: center;
	}

	.spacer {
	  height: 100vh; /* Ensures that the visualization starts off-screen */
	}

	.section-container {
		margin-top: 1.5em;
		transition: background 100ms;
		display: flex;
		justify-content: center;

	}
	
	.sticky {
		position: sticky;
		top: 10%;
		width: 100%;
		justify-content: center;
	}

	.step-content {
		font-size: 1rem;
		background: whitesmoke;
		color: #ccc;
		border-radius: 5px;
		padding: 1rem 1rem;
		display: flex;
		flex-direction: column;
		justify-content: center;
		transition: background 1000ms ease;
		box-shadow: 1px 1px 10px rgba(0, 0, 0, .2);
		right: 5%;
		position: absolute;
		text-align: left;
			width: 75%;
			margin: auto;
			max-width: 500px;
	}

	.step.active .step-content {
		background: white;
		color: black;
	}
	
	.steps-container,
	.sticky {
		height: 100%;
	}

	.steps-container {
		flex: 1 1 0%;
		z-index: 10;
	}
	.article{
		background-color: #c8d9ed;
	}
	

  </style>
  
  <article class="article">
	<section class="article-section" style= "text-align:center;">
	  <h1>Garbage In, Garbage Out</h1>
	  <br>
	  <p>Society makes a lot of trash. We're not quite sure what to do with it.</p>
	  <p>Anthropomorphizing might help. Powered by data from <a href = "https://www.mrtrashwheel.com/">www.mrtrashwheel.com</a>, and thanks to <a href="https://github.com/rfordatascience/tidytuesday/tree/master">#tidytuesday</a> for the idea. </p>
	</section>
  
	<!-- Spacer to ensure visualization starts off-screen -->
	<div class="spacer"></div>
	<div class="section-container">
		<div class="steps-container">
		  <Scrolly bind:value>
			{#each steps as text, i}
			  <div class="step" class:active={value === i}>
				<div class="step-content">{@html text}</div>
			  </div>
			{/each}
			<div class="spacer" />
		  </Scrolly>
		</div>
		<div class="sticky">
		  <Visualization/>
		</div>
	  </div>
	<div style="position:sticky;">
		<Analysis/>
	</div>
  </article>
  