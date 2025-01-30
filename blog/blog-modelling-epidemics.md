# 😷 Modelling Epidemics

---

## Introduction

I naturally grew curious about understanding epidemics and answering several questions related to them because of the kind of situation we are currently living in. Questions like,

- How does a pandemic start?
- How can we predict their end?
- How do you derive strategies for control?
- How does it behave under such strategies?

I knew to be able to understand this, I will first have to understand how an epidemic is modelled mathematically. I searched on the internet for articles and came across a few useful ones that had explained simple mathematical models for the same.

This post is mainly about explaining how epidemics are modelled. I would really appreciate your feedback and ideas on the same and how this can be made more realistic.

## Compartmental Models

In epidemiology, compartment models are used to simplify the modelling of epidemics. These models divide the entire population into compartments with everyone in the same compartment sharing the same characteristics. They represent the various stages through which each member of the community goes through in an outbreak. These models are especially useful in predicting the spread of a disease and its prevalence in society.

Diseases move in and out of a population in several ways. Some are like measles, once contracted, they're never contracted again. Some are like influenza, getting infected once doesn't confer long-lasting immunity. Hence, different compartment models are used for modelling different diseases since they require different compartments. To begin with, we'll start with a simple model to model a disease like measles.

## S-I-R Model

Here, **S** stands for **Susceptible**, **I** stands for **Infected** and **R** stands for **Recovered**, and are the three compartments of the model. This model is a good approximation for infectious diseases which are transmitted from human to human, and where recovery confers lasting resistance. A typical member of the population moves from Susceptible to Infectious to Recovered.

\\[S \\rightarrow I \\rightarrow R\\]

Let **S**, **I**, **R** denote the total number of members in each of the three compartments and **N**, the total population. Assuming the dynamics of the epidemic to be much faster than that of birth and death, we can safely assume **N** to be constant. We then have:

\\[S + I + R = N,\\]

\\[\\dfrac{dS}{dt}+\\dfrac{dI}{dt}+\\dfrac{dR}{dt} = 0\\]

where t is the independent variable measured in days.

Let **β** be the average number of contacts that an infected individual comes with each day. Not all of them are going to be susceptible. If we assume a homogeneous mixing of the population, then the fraction of contacts with susceptible is **S/N**, hence one single infected person infects **βS/N** individuals, whereas **I** of them infects **βSI/N** susceptible individuals. Hence, the rate at which people are leaving the susceptible compartment is:

\\[\\dfrac{dS}{dt} = -\\beta\\dfrac{SI}{N}\\]

Further, let **γ** represents the fraction of infected people that are recovering each day. If there are **I** infected people in total, then **γI** people are recovering each day. Hence, the rate at which people are getting recovered is:

\\[\\dfrac{dR}{dt} = \\gamma I\\]

Finally, rate at which people are getting infected each day is:

\\[\\dfrac{dI}{dt}=\\beta\\dfrac{SI}{N}-\\gamma I\\]

The above three ordinary differential equations together describe the S-I-R model.

### Basic reproduction rate

**β** represents the average number of contacts that an infected individual comes with each day, whereas **1/β** represents the time between two such contacts. Also, **γ** represents the fraction of infected people that recover each day, whereas **1/γ** represents the time it takes for an individual to fully recover. If we represent:

\\[T_c=1/\\beta,\\]

\\[T_r=1/\\gamma\\]

then,

\\[\\dfrac{T_c}{T_r} = \\dfrac{\\beta}{\\gamma},\\]

represents the average number of contacts an infected individual comes with others before the infected has recovered. This ratio:

\\[R_o=\\dfrac{\\beta}{\\gamma},\\]

is called as the **Basic reproduction number**. Its role is extremely important in predicting epidemic outbreaks. In fact, if we rewrite the equation for infectious individuals as:

\\[\\dfrac{dI}{dt}={(R_o\\dfrac{S}{N}-1)}\\gamma I,\\]

it means that if:

\\[R_o>\\dfrac{N}{S(0)},\\]

then:

\\[\\dfrac{dI}{dt}{(0)} > 0,\\]

i.e., and there will be a proper epidemic outbreak with an increase in the number of infected population. On the contrary, if:

\\[R_o < \\dfrac{N}{S{(0)}},\\]

then:

\\[\\dfrac{dI}{dt}{(0)} < 0,\\]

i.e., the disease won't cause an epidemic outbreak regardless of the initial size of the susceptible population.

### SIR model with vital dynamics

Our previous model was without the so-called vital dynamics i.e. it didn't take births and deaths(due to other reasons) into account. In this section, we'll tweak our model to account for the same.

Let **Λ** be the rate at which new individuals are being born into the population and **μ** be the fraction of the total population that dies each day. The rate at which people are dying is **μN**. The rate at which the total population **N** is changing is then given by:

\\[\\Lambda-\\mu N=\\dfrac{dS}{dt}+\\dfrac{dI}{dt}+\\dfrac{dR}{dt},\\]

where,

We then have the following ordinary differential equations as our model:

\\[\\dfrac{dS}{dt}=\\Lambda-\\beta\\dfrac{SI}{N}-\\mu S,\\]

\\[\\dfrac{dI}{dt} = \\beta\\dfrac{SI}{N}-\\gamma I-\\mu I,\\]

\\[\\dfrac{dR}{dt} = \\gamma I -\\mu R,\\]

## Elaborations on the basic SIR model

Now that we have understood how to go about modelling a single outbreak, we can far easily extend on our previous understanding to begin modelling more complicated and detailed scenarios. Consider this section more as an exercise for yourself in modelling epidemics with various compartments.

### SIS model

It's a model for diseases that don't lead to any long-lasting immunity. You become susceptible again once you recover from the disease. Infections like common cold and influenza are modelled this way. It consists of two compartments, **Susceptible** and **Infected**:

\\[S\\leftrightarrow I,\\]

and we have the following model:

\\[\\dfrac{dS}{dt}=-\\beta\\dfrac{SI}{N}+\\gamma I,\\]

\\[\\dfrac{dI}{dt} = \\beta\\dfrac{SI}{N}-\\gamma I\\]

### MSIR model

Individuals born newly into the population have maternal antibodies passed onto them from their mother's placenta and are immune for a few months against certain diseases like measles. This is called passive immunity and we the denote its compartment by **M**(Maternally derived immunity):

\\[M\\rightarrow S\\rightarrow I \\rightarrow R\\]

Let's assume that the birth rate of the population is **Λ** and **μ** is the fraction of the total population that dies daily. If **𝛿** fraction of babies leave the immune compartment every day then we have the following model:

\\[\\dfrac{dM}{dt}=\\Lambda-\\delta I-\\mu I,\\]

\\[\\dfrac{dS}{dt} = \\delta I-\\beta\\frac{SI}{N} -\\mu S,\\]

\\[\\dfrac{dI}{dt}=\\beta\\dfrac{SI}{N}-\\gamma I-\\mu I,\\]

\\[\\dfrac{dR}{dt}=\\gamma I -\\mu R,\\]

### SEIR model

Generally, for some infections, infected people don't become infectious instantaneously. Instead, there's an incubation period over which he become infectious. The individual is neither susceptible nor infectious but is rather exposed to the infection, and we denote its compartment by E:

\\[S \\rightarrow E \\rightarrow I \\rightarrow R,\\]

Assuming that a fraction ε of exposed people become infectious every day, we have the following model:

\\[\\dfrac{dS}{dt} = -\\beta\\dfrac{SI}{N} -\\mu S,\\]

\\[\\dfrac{dE}{dt}=\\beta\\dfrac{SI}{N} -\\epsilon E-\\mu E,\\]

\\[\\dfrac{dI}{dt}=\\epsilon E-\\gamma I-\\mu I,\\]

\\[\\dfrac{dR}{dt}=\\gamma I -\\mu R,\\]
