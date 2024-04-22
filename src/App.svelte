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
		"<p>Look close! The blue dot represents a single plastic water bottle.</p>",
		"<p>There goes a cigarette butt.</p>",
		"<p>Anyone missing a ball? A glass bottle? Polyethylene? An old wrapper? A plastic bag? </p>",
		"<p>Let's see how much comes through in a typical day's work, which we'll track as 24 hours.</p>",
		"<p>Mr. Trash Wheel was first installed in May 9, 2014.</p>",
		"<p>There are three other Baltimore-based machines: the Wheel family is completed by Captain Trash Wheel, Professor Trash Wheel, and most recently in 2021, Gwynnda the Good Wheel of the West.</p>",
		"<p>On his best day, he picked up 38,000 lbs of garbage. The amount you're seeing now is just a fraction of that.</p>",
		"<p>Automated cleanup projects, <a href='https://www.washingtonpost.com/science/2019/01/17/experts-warned-this-floating-garbage-collector-wouldnt-work-ocean-proved-them-right/'>especially at a larger scale,</a> have provoked skepticism from scientists in terms of practicality and impact.</p>",
		"<p>Even still, the maker of Mr. Trash Wheel told <a href='https://www.newyorker.com/tech/annals-of-technology/the-promise-of-mr-trash-wheel'>The New Yorker</a> that the device is \"treating a symptom of the disease. It's not a cure.\"</p>",
		"<p>These machines are placed a the mouth of rivers, which are a large source of plastic pollution in the oceans and can play an important part in cleanup.</p>",
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
	  margin: 5px auto;
	  text-align: center;
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

	.half-spacer {
	  height: 50vh; /* Ensures that the visualization starts off-screen */
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
	<section class="article-section">
	  <h1 style="font-size:50px">Mr. Trash Wheel®</h1>
	  <br>
	  <p>Society makes a lot of trash. We're not quite sure what to do with it.</p>
	  <p>Anthropomorphizing might help.</p>
	  <p>Powered by data from <a href = "https://www.mrtrashwheel.com/">www.mrtrashwheel.com</a>, and thanks to <a href="https://github.com/rfordatascience/tidytuesday/tree/master">#tidytuesday</a> for the idea. </p>
	  <p>Works best on desktop. Keep scrolling!</p>
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
			<Visualization {steps}/>
		</div>
	</div>
	<div style="position:sticky;">
		<Analysis/>
	</div>

	<div class="half-spacer" />
	<section class="article-section">
		<h2>Mr. Trash Wheel Chugs On</h2>
		<p style="text-align:left">In a time of rapid warming and high levels of carbon, <a href='https://www.nytimes.com/2024/03/31/climate/climate-change-carbon-capture-ccs.html'>engineering our way out of a climate catastrophe</a> can feel fraught. Even Mr. Trash Wheel, due to the complexities involved, must burn the contents of his dumpsters each day rather than recycle the plastics found (the incineration is used to create electricity).</p>
		<p style="text-align:left">In spite of that, it's galvanizing to see projects that can make an immediate impact on communities and begin to mitigate some of the damage today. While the fight continues for limiting single-use plastics, more googly-eyed plastic interceptors can help alleviate the waste throghout our econosytem in the meantime.</p>
	</section>

	<div class="half-spacer" />

	<p style="font-size:14px;">Built in Svelte. Thanks to Michell Estberg for his contributions.</p>
	
  </article>
  