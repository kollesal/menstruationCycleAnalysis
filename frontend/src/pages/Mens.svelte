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
	<div class="col-md-8" />
	<h1>
		Our model predicts that you will be Ovulating on the {ovulation}. Day of
		your Cycle!
	</h1>
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
			<label for="mens">Menstruation this Month</label>
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
				type="button"
				class="my-button"
				on:click={handleSubmit}
				on:click={calculateBMI(weight, height)}
				>Ovulation estimation</button
			>
		</div>
	</div>

	<div class="col-md-8" />
	<div class="row justify-content-md-center">
		<img src="cycle.png" class="rounded mx-auto d-block" alt="..." />
	</div>
</div>
