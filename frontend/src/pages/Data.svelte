<script>
    import { base_url } from "../store";
    import axios from "axios";
</script>

<div class="container">
    <h1>Data Collection and preparation</h1>
    <h2>Data Collection</h2>
    <h3>Considerations about the topic</h3>
    <p>
        As the Information about the female menstrual cycle is personal
        information, it was really hard to find any datasets about it. Due to
        this problem, the aggregated data is rather small - which shouldn't be a
        big problem.
    </p>

    <ul>
        <li>
            As I am already familiar with the topic of the menstrual cycle and
            natural contraception, I thought this could be a great topic,
            because there is a lot of data to analyse!
        </li>
        <li>
            While working on the project I noticed, that this topic may not be
            the best one for KI-models. To be fair, there is a big amount of
            data to analyse, but the target values don't have a long bandwith. A
            cycle is approx 28 days, a menstration is approx. 5 days and the
            ouvlation day is approx. on day 14. Additionally, the accuracy of
            the model should be really high, as I have the target value 'first
            day of high', which is the ovulation day. This is theoretically the
            day, that afterwards the woman can't get pregnant anymore. That's
            why I will take into consideration, if the predicted values differ
            from the mean of the target variable.
        </li>
        <li>
            So I will analyse, if the KI-models are actually of value in this
            topic!
        </li>
        <li>
            Because the target variable doesn't change that much, we don't
            necessarily need a large dataset - all the datapoints + the value to
            predict are approx. in the same range. So we would either need a
            huge dataset to bring the accuracy as low as possible, or we use a
            rather small dataset and make predictions. I am doing the second
            one, as I don't have that many datapoints.
        </li>
    </ul>

    <h3>Considerations about the data</h3>

    <p>When analysing the data, the following points are outstanding:</p>
    <ul>
        <li>The data type of all columns is exclusively numeric</li>
        <li>
            We are calculating full cycle days. This means, that we are working
            exclusively with INT values, normally between 0-30
        </li>
        <li>
            There is a difference between the cycle length and the cycle day.
            For the training of the model, we will use exclusively the cycle
            dataset.
        </li>
        <li>
            Women often track their cycles in relation to get pregnant. This
            also means, it can be used as a natural contraception method. All
            datapoints have been aggregated in which the women have tracked
            their period in order to have a natural contraception method. This
            means, that the dataset also contains valuable information and many
            further aspects of getting pregnant / not getting pregnant. This
            also explains to why the Kaggle Dataset contains 80 Columns! I will
            only use approx. 10 variables of all the datasets.
        </li>
        <li>
            I would have liked to analyse the correlation between moonphases or
            moodswings and the cycle, but as my largest dataset (Kaggle) doesn't
            have any points like location / date / time, it was not possible to
            add further information. (I have no linking variable)
        </li>
    </ul>

    <div class="col-md-8" />

    <h3>FedCycleData071012.csv</h3>
    <ul>
        <li>
            The data was imported from this Kaggle dataset: <a
                href="https://www.kaggle.com/datasets/nikitabisht/menstrual-cycle-data"
                >Menstrual Cycle Data</a
            >
        </li>
        <li>The data contains 159 women</li>
        <li>The data contains 1665 cyles (approx. 1 month) of 159 women</li>
        <li>
            The clientID have the value 'nfp' in it. This is actually a natural
            contraception method called 'natürliche Familenplanung': <a
                href="https://www.mynfp.de/nfp-regeln">NFP</a
            >
        </li>

        <div class="col-md-8" />
        <div class="row justify-content-md-center">
            <img
                src="pictures/kaggle.jpg"
                class="rounded mx-auto d-block"
                alt="..."
            />
        </div>
    </ul>

    <h3>cycles.csv</h3>
    <ul>
        <li>
            This is a csv file from my 'myNFP' App. It doesn't have a lot of
            entries, as the app was not possible to download in switzerland for
            a period of time. Thats why I started with this app some months ago.
        </li>
        <li>
            I had to do a lot of cleaning, as there were multiple datapoints,
            that were too much in detail
        </li>
        <li>
            For the natural contraception there are 3 factors to consider: The
            temarature, the mucus and the feeling of the cervix (it can be hard
            or soft). In the Kaggle dataset, this entries were already cleaned.
            That's what I had to do with mine. All the unnecessary datapoints
            were cleaned.
        </li>

        <div class="col-md-8" />
        <div class="row justify-content-md-center">
            <img
                src="pictures/salome.jpg"
                class="rounded mx-auto d-block"
                alt="..."
            />
        </div>
    </ul>

    <h3>Red Folder</h3>
    <ul>
        <li>
            The dataset is being used in the fine tuning of the Model and not in
            the data preparation step
        </li>
        <li>
            The dataset contains the cycles from my mother for a bit more than a
            year.
        </li>
        <li>
            Because the data is not digitalised, I created a new dataframe in
            the jupiter notebook and put the data directly into the df.
        </li>
        <p />
        <div class="row justify-content-md-center">
            <img
                src="pictures/mueter.jpg"
                class="rounded mx-auto d-block"
                alt="..."
            />
        </div>
        <p />

        <li>
            This is the digitalised version in the df:
            <p />
        </li>

        <div class="row justify-content-md-center">
            <img
                src="pictures/mueter_df.jpg"
                class="rounded mx-auto d-block"
                alt="..."
            />
        </div>
    </ul>

    <h1>Data Preparation</h1>
    <h3>FedCycleData071012.csv</h3>
    <ul>
        <li>
            At first, the colums were specified and put into a numeric value:
            <img
                src="pictures/kaggle_dtype.jpg"
                class="rounded mx-auto d-block"
                alt="..."
            />
        </li>
        <li>
            Then, I had to clean the attributes of the women (Age, Weight,
            Height, BMI + NumberPreg). So the problem was: If a woman has 10
            cycles in the dataset, this are 10 rows. But the attributes of the
            women were only in the first row documented. So I had to copy the
            values of the Age row, until there is a new Row with already a value
            filled out -> this would be the next woman. (Age Before: [36, 0, 0,
            0, 55, 0, 0] Age After: [36, 36, 36, 36, 55, 55, 55])
        </li>
        <li>
            For Height and Weight I also changed the variables to the metric
            System.
            <img
                src="pictures/kaggle_attributes.jpg"
                class="rounded mx-auto d-block"
                alt="..."
            />
        </li>
    </ul>

    <h1>Data Aggregation</h1>

    <h3>cycles.csv</h3>

    <ul>
        <li>
            For my own data I had to clean at first the headers of the columns I
            wanted to use and dump the ones I didn't need:
            <img
                src="pictures/salome_cleansing.jpg"
                class="rounded mx-auto d-block"
                alt="..."
            />
        </li>

        <li>
            Then, I filled out the columns of the ones I knew my data (Age,
            Weight, etc.)
            <img
                src="pictures/salome_aggr.jpg"
                class="rounded mx-auto d-block"
                alt="..."
            />
        </li>
        <li>
            And I merged the 2 files (I used concat as there are more
            data-rows):
            <img
                src="pictures/salome_merge.jpg"
                class="rounded mx-auto d-block"
                alt="..."
            />
        </li>
    </ul>

    <h1>Data Cleaning</h1>
    <ul>
        <li>
            Then, same old with missing values and duplicated values:
            <img
                src="pictures/cleaning_missing.jpg"
                class="rounded mx-auto d-block"
                alt="..."
            />
        </li>

        <li>
            Missing values were filled in with the median value:
            <img
                src="pictures/cleaning_fillna.jpg"
                class="rounded mx-auto d-block"
                alt="..."
            />
        </li>
        <li>
            Which can also be done by the Imputer:
            <img
                src="pictures/cleaning_imputer.jpg"
                class="rounded mx-auto d-block"
                alt="..."
            />
        </li>
    </ul>

    <h1>Feature Engineering</h1>
    <ul>
        <li>
            I created a new category for the cycle length. This, so that it can
            be determined, if the cycle length was short, normal or long:
            <img
                src="pictures/feature_cycle.jpg"
                class="rounded mx-auto d-block"
                alt="..."
            />
        </li>

        <li>
            Same for Length of Menses:
            <img
                src="pictures/feature_menses.jpg"
                class="rounded mx-auto d-block"
                alt="..."
            />
        </li>
        <li>
            Then, I also wanted to analyse each day of the cycle. This due to
            the fact, that I wanted to prognose at first in which phase of the
            cycle a woman is. That's why I splitted the dataset (Before: 1 row =
            1 Cycle; After: 1 row = 1 Cycle Day):
            <img
                src="pictures/feature_splitting.jpg"
                class="rounded mx-auto d-block"
                alt="..."
            />
        </li>
        <li>
            Then I also created a label that each day can be associated to a
            cycle phase:
            <img
                src="pictures/feature_phase.jpg"
                class="rounded mx-auto d-block"
                alt="..."
            />
        </li>
        <li>
            And lastly export the file:
            <img
                src="pictures/export.jpg"
                class="rounded mx-auto d-block"
                alt="..."
            />
        </li>
    </ul>
</div>
