<script>
	import Router from "svelte-spa-router";
	import routes from "./routes";
</script>

<!-- This part is always displayed -->

<nav class="navbar navbar-expand-lg navbar-light bg-light">
	<!-- svelte-ignore a11y-invalid-attribute -->
	<a class="navbar-brand" href="#/">Home</a>
	<button class="navbar-toggler" type="button" data-toggle="collapse" data-target="#navbarNav" aria-controls="navbarNav" aria-expanded="false" aria-label="Toggle navigation">
	  <span class="navbar-toggler-icon"></span>
	</button>
	<div class="collapse navbar-collapse" id="navbarNav">
	  <ul class="navbar-nav">

		<li class="nav-item">
		  <a class="nav-link" href="#/mens">Ovulation Regression</a>
		</li>
		<li class="nav-item">
			<a class="nav-link" href="#/motivation">Motivation</a>
		  </li>

		<li class="nav-item">
		  <a class="nav-link" href="#/data">Data Collection and preparation</a>
		</li>
	  </ul>
	</div>
  </nav>


<div class="container mt-3">
	<!-- Here we load the page depending on the current URL -->
	<Router {routes} />
</div>