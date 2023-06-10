<script>
	import { base_url } from "../store";
	import axios from "axios";

	let age;
	let height;
	let weight;
	let lengthofCycle;
	let lengthofMens;
	let bmi = "";
	let ovulation = "...";

	function handleSubmit() {
		let url =
			// $base_url +
			"https://kollesal.pythonanywhere.com" +
			"/api/prediction/mens?age=" +
			age +
			"&cycle=" +
			lengthofCycle +
			"&menses=" +
			lengthofMens +
			"&weight=" +
			weight +
			"&height=" +
			height;
		console.log(url);
		axios.get(url).then((response) => {
			ovulation = response.data;
		});
	}

	function calculateBMI(weight, height) {
		bmi = ((weight / height / height) * 10000).toFixed(2);
		return bmi;
	}
</script>

<div class="container text-center">
	<h1>Are you Ovulating?</h1>


	<div class="col-md-12" />

	<div class="row justify-content-md-center">
		<div class="col col-lg-3" />
		<div class="col col-lg-2">
			<label for="Age">Age</label>
			<input
				type="number"
				class="form-control"
				placeholder="Age"
				aria-label="Age"
				bind:value={age}
			/>
		</div>
		<div class="col col-lg-2">
			<label for="Weight">Weight</label>
			<input
				type="number"
				class="form-control"
				placeholder="Weight"
				aria-label="Weight"
				bind:value={weight}
			/>
		</div>
		<div class="col col-lg-2">
			<label for="Height">Height</label>
			<input
				type="number"
				class="form-control"
				placeholder="Height"
				aria-label="Height"
				bind:value={height}
			/>
		</div>
		<div class="col col-lg-2">
			<label for="BMI">BMI</label>
			<input
				type="text"
				readonly
				class="form-control-plaintext"
				aria-label="BMI"
				value={bmi}
			/>
		</div>
		<div class="col col-lg-1" />
		<div class="col-md-8" />
		<div class="col col-lg-4" />
		<div class="col col-lg-2" />
		<div class="col col-lg-2">
			<label for="length" />
			<p>Length of</p>
		</div>

		<div class="col col-lg-2">
			<label for="cycle">Average Cycle</label>
			<input
				type="number"
				class="form-control"
				placeholder="in Days"
				aria-label="cycle"
				bind:value={lengthofCycle}
			/>
		</div>
		<div class="col col-lg-2">
			<label for="mens">Menstruation</label>
			<input
				type="number"
				class="form-control"
				placeholder="in Days"
				aria-label="Mens"
				bind:value={lengthofMens}
			/>
		</div>
		<div class="col col-lg-4" />

		<div class="col-md-8" />
		<div class="col col-lg-4" />

		<div class="col col-lg-2">
			<button
			data-bs-toggle="modal" data-bs-target="#exampleModal"
				type="button"
				class="my-button"
				data-toggle="modal"
				data-target="#ovulationModal"
				on:click={handleSubmit}
				on:click={calculateBMI(weight, height)}
				>Ovulation estimation</button
			>
		</div>
	</div>

	<div class="col-md-8" />
	<div class="row justify-content-md-center">
		<img src="pictures/cycle.png" class="rounded mx-auto d-block" alt="..." />
	</div>
</div>


<!-- Modal -->
<div class="modal fade" id="exampleModal" tabindex="-1" aria-labelledby="exampleModalLabel" aria-hidden="true">
	<div class="modal-dialog">
	  <div class="modal-content">
		<div class="modal-header">
		  <h5 class="modal-title" id="exampleModalLabel">Ovulation Estimation</h5>
		  <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
		</div>
		<div class="modal-body">
			Our model predicts that you will be Ovulating on the {ovulation}. Day of
			your Cycle!
		</div>
		<div class="modal-footer">
		  <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
		</div>
	  </div>
	</div>
  </div>