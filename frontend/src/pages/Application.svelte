<script>
    import { base_url } from "../store";
    import axios from "axios";
</script>

<div class="accordion" id="accordionPanelsStayOpenExample">
    <div class="accordion-item">
      <h2 class="accordion-header" id="panelsStayOpen-headingOne">
        <button class="accordion-button" type="button" data-bs-toggle="collapse" data-bs-target="#panelsStayOpen-collapseOne" aria-expanded="true" aria-controls="panelsStayOpen-collapseOne">
            Frontend and Backend
        </button>
      </h2>
      <div id="panelsStayOpen-collapseOne" class="accordion-collapse collapse show" aria-labelledby="panelsStayOpen-headingOne">
        <div class="accordion-body">
            The code is accessible on the GitHub from ZHAW: <a
            href="https://github.zhaw.ch/kollesal/ki-anwendung"
            >https://github.zhaw.ch/kollesal/ki-anwendung</a
        >
        </div>
      </div>
    </div>
    <div class="accordion-item">
      <h2 class="accordion-header" id="panelsStayOpen-headingTwo">
        <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#panelsStayOpen-collapseTwo" aria-expanded="false" aria-controls="panelsStayOpen-collapseTwo">
            Demo
        </button>
      </h2>
      <div id="panelsStayOpen-collapseTwo" class="accordion-collapse collapse" aria-labelledby="panelsStayOpen-headingTwo">
        <div class="accordion-body">
            The Application is available on the following site: <a
            href="ovulation.netlify.com">ovulation.netlify.com</a
        >
        </div>
      </div>
    </div>
    <div class="accordion-item">
      <h2 class="accordion-header" id="panelsStayOpen-headingThree">
        <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#panelsStayOpen-collapseThree" aria-expanded="false" aria-controls="panelsStayOpen-collapseThree">
            Results and user validation
        </button>
      </h2>
      <div id="panelsStayOpen-collapseThree" class="accordion-collapse collapse" aria-labelledby="panelsStayOpen-headingThree">
        <div class="accordion-body">
            <h3>Goals and Questions</h3>

            <ul>
                <li>Are there usability problems and where are they?</li>
                <li>
                    Are there functions that are not understood by the
                    users?
                </li>
                <li>Is the application useful?</li>
            </ul>

            To test the goals, the test persons could give a rating between
            1- 5 points (1 point = poor, 5 points = very good) in the
            following categories:
            <p />

            <table>
                <thead>
                    <tr>
                        <th>Test Users</th>
                        <th>Age</th>
                        <th>Reliability</th>
                        <th>Usability</th>
                        <th>Usefulness</th>
                        <th>Performance</th>
                        <th>Appealing design</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>Anja</td>
                        <td>25</td>
                        <td>3</td>
                        <td>4</td>
                        <td>2</td>
                        <td>2</td>
                        <td>4</td>
                    </tr>
                    <tr>
                        <td>Wynona</td>
                        <td>28</td>
                        <td>3</td>
                        <td>3</td>
                        <td>4</td>
                        <td>3</td>
                        <td>4</td>
                    </tr>
                    <tr>
                        <td>Sophie</td>
                        <td>38</td>
                        <td>2</td>
                        <td>2</td>
                        <td>3</td>
                        <td>4</td>
                        <td>5</td>
                    </tr>
                    <tr>
                        <td>Alexandra</td>
                        <td>24</td>
                        <td>4</td>
                        <td>4</td>
                        <td>3</td>
                        <td>2</td>
                        <td>3</td>
                    </tr>
                    <tr>
                        <td>Marie</td>
                        <td>29</td>
                        <td>3</td>
                        <td>4</td>
                        <td>3</td>
                        <td>2</td>
                        <td>4</td>
                    </tr>
                    <tr>
                        <td>Total</td>
                        <td />
                        <td>3.6</td>
                        <td>3.4</td>
                        <td>3</td>
                        <td>2.6</td>
                        <td>4</td>
                    </tr>
                </tbody>
            </table>
            <p />
            <h3>Anwering the Questions</h3>

            <ul>
                <li>
                    <p>Are there usability problems and where are they?</p>
                    <p>
                        Yes, there are usability problems. For example,
                        there could be help to which fields are required to
                        be filled out.
                    </p>
                </li>
                <li>
                    <p>
                        Are there functions that are not understood by the
                        users?
                    </p>
                    <p>
                        Yes, mostly the function was understood for the
                        experienced users. For inexperienced persons there
                        should be more information and help sites.
                    </p>
                </li>
                <li>
                    <p>Is the application useful?</p>
                    <p>
                        Mostly not. It gives an average to when the
                        ovulation is expected. There could be additional
                        features, where a person could type in the last day
                        of the menses and the application will calulate on
                        which calendar date the ovulation will be most
                        likely. In this way, the user doesn't has to
                        calculate with Cycle days and can use the Calendar
                        days.
                    </p>
                </li>
            </ul>
        </div>
      </div>
    </div>
  </div>

<style>
    .accordion-button {
        display: inline-block;
        color: #ffffff;
        background-color: #5402c0;
        padding: 10px 20px;
        border-radius: 4px;
        text-decoration: none;
        font-family: "Arial", sans-serif;
        font-weight: bold;
        text-transform: uppercase;
        transition: background-color 0.3s ease;
        border: none;
    }

    .accordion-button:hover {
        background-color: #ff4081;
        color: #ffffff;
    }

    .accordion-button:active {
        color: #5402c0;
    }

      .accordion-body {
        background-color: #FBF4FE;
        color: black;
        padding: 10px;
    }

    a {
        color: #5402c0;
    }

    a:hover {
        color: #ff4081;
    }

    table {
        width: 100%;
        border-collapse: collapse;
    }

    th,
    td {
        padding: 8px;
        text-align: left;
        border-bottom: 1px solid #ddd;
    }

    th {
        background-color: #f5f5f5;
        font-weight: bold;
    }

    tbody tr:last-child {
        font-weight: bold;
    }
</style>
