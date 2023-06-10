<script>
    import { base_url } from "../store";
    import axios from "axios";
</script>

    <h1>Motivation</h1>
    <h2>Problem Statement</h2>


    <div class="accordion" id="accordionPanelsStayOpenExample">
        <div class="accordion-item">
          <h2 class="accordion-header" id="panelsStayOpen-headingOne">
            <button class="accordion-button" type="button" data-bs-toggle="collapse" data-bs-target="#panelsStayOpen-collapseOne" aria-expanded="true" aria-controls="panelsStayOpen-collapseOne">
              End users
            </button>
          </h2>
          <div id="panelsStayOpen-collapseOne" class="accordion-collapse collapse show" aria-labelledby="panelsStayOpen-headingOne">
            <div class="accordion-body">
                <h4>Considerations</h4>
                <ul>
                    <li>
                        The End Users of this application are women that
                        have an active menstrual cycle
                    </li>
                    <li>
                        The women must be in a post-puberty state and before
                        the menopause. (approx. Age between 14 - 50)
                    </li>
                    <li>
                        Pregnant woman also can't be included, as they
                        normally don't have their period.
                    </li>
                    <li>The women must be biologically female</li>
                    <li>
                        The menstrual cycle doesn't has to be constant. It's
                        important, that the women have a cycle. Especially
                        after discontinuing a hormonal contraception method,
                        the menstrual cycle can be quite irregular. This is
                        not a problem. But if the person doesn't have the
                        menstruation at all, the prediction will not work,
                        as there is no active cycle.
                    </li>
                    <li>
                        Also, the women want to know how their body works
                        and is interested to learn about the menstrual cycle
                        / is already familiar
                    </li>
                    <li>
                        There are already quite a lot of contraceptives. The
                        tracking of the menstrual cycle doesn't has to be
                        for a contraception method. It can also be done
                        additionally to another contraception method just to
                        get to know in what cycle phase the body is right
                        now.
                    </li>

                    <p />
                    <img
                        src="pictures/contraception.png"
                        class="rounded mx-auto d-block"
                        style="width: 600px; height: auto;"
                        alt="..."
                    />
                </ul>

                <h4>Final End Users:</h4>
                <ul>
                    <li>Women that don't want to get pregnant</li>
                    <li>Women that want to get pregnant</li>
                    <li>
                        Women that want to get to know their body better
                    </li>
                </ul>
            </div>
        </div>
    </div>
      
        <div class="accordion-item">
          <h2 class="accordion-header" id="panelsStayOpen-headingTwo">
            <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#panelsStayOpen-collapseTwo" aria-expanded="false" aria-controls="panelsStayOpen-collapseTwo">
                Goals of end users
            </button>
          </h2>
          <div id="panelsStayOpen-collapseTwo" class="accordion-collapse collapse" aria-labelledby="panelsStayOpen-headingTwo">
            <div class="accordion-body">
                <h4>Goals of end users</h4>
                <ul>
                    <li>
                        There are studies that show the impact of the
                        menstrual cycle in relation to sport: <a
                            href="https://www.ncbi.nlm.nih.gov/pmc/articles/PMC7916245/"
                            >Study</a
                        >
                    </li>
                    <li>
                        The menstrual cycle is influencing the thoughts,
                        feelings and body (temparature, skin, etc.) of
                        women. So the body is giving clear indication to how
                        a woman can expect to feel each day. So why not
                        listen to it?
                    </li>
                    <li>
                        The standard Cycle Length is 28 days and the
                        Ovulation day is the most important one. It is one
                        single day, that the female body can actually get
                        pregnant (apart from the 5 days where sperm can
                        survive in the uterus)
                    </li>
                    <li>
                        The women's goal is to get a prediction, to when
                        this day most likely will occur.
                    </li>
                    <li>
                        For women that don't want to get pregnant: After
                        this day, it is theoretically safe
                    </li>
                    <li>
                        For women that want to get pregnant: Before this day
                        and up to 5 days before the chances to get pregnant
                        are highest
                    </li>
                    <li>
                        For women that want to get to know their body
                        better: This is the best phase of the whole cycle,
                        as the mood is great and body as well
                    </li>
                    <li>
                        By getting a prediction about the Ovulation date, the daily routines can be adjusted accordingly. For example: Heavy workouts should be planned around the ovulation date.
                    </li>

                    <p />
                    <img
                        src="pictures/cycle_phases_mood.png"
                        class="rounded mx-auto d-block"
                        alt="..."
                    />
                </ul>
            </div>
        </div>
    </div>
        <div class="accordion-item">
          <h2 class="accordion-header" id="panelsStayOpen-headingThree">
            <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#panelsStayOpen-collapseThree" aria-expanded="false" aria-controls="panelsStayOpen-collapseThree">
                Obstacle to be solved
            </button>
          </h2>
          <div id="panelsStayOpen-collapseThree" class="accordion-collapse collapse" aria-labelledby="panelsStayOpen-headingThree">
            <div class="accordion-body">
                <h4>Obstacle to be solved</h4>
                <ul>
                    <li>
                        With the model women can predict the day that they are ovulating
                    </li>
                    <li>
                        According to the prediction, daily activities can be planned
                    </li>
                    <li>
                        Also, it's being analysed, if factors like age or weight/height have influence to the prediction.
                    </li>
                    <li>
                        Does the prediction differ a lot from the mean of the Ovulation Day 12?
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
    .accordion-button:active {
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

    .accordion-body {
        background-color: #FBF4FE;
        color: black;
        padding: 10px;
    }

    .accordion-button:focus {
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

  

</style>