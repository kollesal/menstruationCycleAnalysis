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
		<li class="nav-item">
			<a class="nav-link" href="#/training">Model Training</a>
		  </li>
		  <li class="nav-item">
			<a class="nav-link" href="#/application">Model Application</a>
		  </li>
	  </ul>
	</div>
  </nav>


<div class="container mt-3">
	<!-- Here we load the page depending on the current URL -->
	<Router {routes} />
</div>

<style>
	.navbar.navbar-light {
	  background-color: #C6A1CF;
	  padding: 10px;
	}
  
	.navbar-brand {
	  font-weight: bold;
	  color: #333;
	  text-decoration: none;
	  margin-right: 20px;
	}
  
	.navbar-toggler {
	  border: none;
	  padding: 0;
	  background-color: transparent;
	}
  
	.navbar-toggler-icon {
	  width: 20px;
	  height: 20px;
	  background-color: #333;
	  border-radius: 2px;
	}
  
	.collapse.navbar-collapse {
	  display: flex;
	  justify-content: flex-end;
	}
  
	.navbar-nav .nav-item {
	  margin: 0 10px;
	}
  
	.navbar-nav .nav-link {
	  color: #333;
	  text-decoration: none;
	}
  
	.navbar-nav .nav-link:hover {
	  color: #666;
	}
  
	.navbar-nav .nav-item:first-child .nav-link {
	  font-weight: bold;
	  color: #4C3E4F;
	}
  </style>