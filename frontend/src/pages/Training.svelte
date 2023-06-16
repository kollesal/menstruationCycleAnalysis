<script>
    import { base_url } from "../store";
    import axios from "axios";
</script>

<h1>Model Training</h1>

<p>For the Model comparison, I used the following models:</p>

<img
    src="pictures/all_models.jpg"
    class="rounded mx-auto d-block"
    style="width: 1000px; height: auto;"
    alt="..."
/>

<h1>Fine Tuning</h1>
<ul>
    <li>
        <strong>Get a more complex model</strong>: as the model already works very well with the
        linear Regression model, the model itself is not the problem. But I
        could search for a more complex problem, that has a bigger variety in
        the data than this.
    </li>
    <li>
        <strong>Get more data</strong>: This is a possibility. I also have already added some
        more data, but as my target Variable already doesn't vary that much,
        there doesn't has to be a lot of more data. Also, I don't have more
        information about date / time or location points, so I cannot add more
        data (like moon phases or so)
    </li>
    <li>
        <strong>Feature engineering</strong>: As my values are already very stanardised and of
        type int, there are not many options.
    </li>
    <li>
        <strong>Data cleaning</strong>: Not needed. Our dataset is already very clean and has
        only int values
    </li>
    <li><strong>Pipelines</strong>: Used in Poly Model</li>
    <li><strong>Scaling</strong>: Done</li>
    <li><strong>Grid Search</strong>: Done</li>
</ul>

<img
    src="pictures/module_final_rmse.jpg"
    class="rounded mx-auto d-block"
    style="width: 1000px; height: auto;"
    alt="..."
/>

<h1>Error analysis performance</h1>

<h3>RMSE</h3>
<ul>
    <li>
        Already before any fine tuning was done, the model was already performing very well. This is due to the fact, that the predicted values dont't has a wide range. The ovulation day differs from approx. 10-15 (as stated in the Data collection section).
    </li>
    <li>
        Even with aggregating more data, perform the GridSearch, Scaling and look at the most important features, the model did improve only marginally.
    </li>
    <li>
        As our dataset only contains numeric values, we don't have unstructured data, that could influence our model
    </li>
</ul>

<img
    src="pictures/model_residual.jpg"
    class="rounded mx-auto d-block"
    style="width: 1000px; height: auto;"
    alt="..."
/>


<h3>Original Hypothesis</h3>
In the Motivation Section, I defined the following hypothesis: Does the prediction differ a lot from the mean of the Ovulation Day 12?
<ul>
    <li>
        The following graph shows 20 samples with the predicted and observed data
    </li>
    <li>
        We can see, that our model is more accurate than the mean value of the target variable.
    </li>
    <li>
        However, we can also see, that the mean is pretty accurate. And doesn't differ a lot. 
    </li>
</ul>
<img
    src="pictures/model_comparison.jpg"
    class="rounded mx-auto d-block"
    style="width: 1000px; height: auto;"
    alt="..."
/>

<h3>Is my model Over- or Underfitting?</h3>

<ul>
    <li>
        Da die Testdaten im Vergleich zu den Traingingsdaten ziemlich ähnlich sind, kann davon ausgegangen werden, dass kein Overfitting der Fall ist im Modell.
    </li>
    <li>
        Und da generell der Error sehr tief ist, kann auch davon ausgegangen werden, dass kein Underfitting stattfindet (das Modell passt sehr gut, deswegen gibt es auch tiefe Differenzen/Residuals).
    </li>
    <li>
        So no, my model is fitting optimal! 
    </li>
</ul>
<img
    src="pictures/model_train_test.jpg"
    class="rounded mx-auto d-block"
    style="width: 1000px; height: auto;"
    alt="..."
/>




