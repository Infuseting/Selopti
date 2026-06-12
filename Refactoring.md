# Refactoring

## What is refactoring 

### Clean code

The main purpose of refactoring is to fight technical debt. It transforms a mess into clean code and simple design.

Nice! But whatâ€™s clean code, anyway? Here are some of its features:

#### Clean code is obvious for other programmers.

And Iâ€™m not talking about super sophisticated algorithms. Poor variable naming, bloated classes and methods, magic numbers -you name it- all of that makes code sloppy and difficult to grasp.

#### Clean code doesnâ€™t contain duplication.

Each time you have to make a change in a duplicate code, you have to remember to make the same change to every instance. This increases the cognitive load and slows down the progress.

#### Clean code contains a minimal number of classes and other moving parts.

Less code is less stuff to keep in your head. Less code is less maintenance. Less code is fewer bugs. Code is liability, keep it short and simple.

#### Clean code passes all tests.

You know your code is dirty when only 95% of your tests passed. You know youâ€™re screwed when your test coverage is 0%.

#### Clean code is easier and cheaper to maintain!

### Technical Debt

Everyone does their best to write excellent code from scratch. There probably isnâ€™t a programmer out there who intentionally writes unclean code to the detriment of the project. But at what point does clean code become unclean?

The metaphor of â€œtechnical debtâ€ in regards to unclean code was originally suggested by Ward Cunningham.

If you get a loan from a bank, this allows you to make purchases faster. You pay extra for expediting the process - you donâ€™t just 
pay off the principal, but also the additional interest on the loan. Needless to say, you can even rack up so much interest that the amount of interest exceeds your total income, making full repayment impossible.

The same thing can happen with code. You can temporarily speed up without writing tests for new features, but this will gradually slow your progress every day until you eventually pay off the debt by writing tests.

#### Causes of technical Debt

##### Business pressure

Sometimes business circumstances might force you to roll out features before theyâ€™re completely finished. In this case, patches and kludges will appear in the code to hide the unfinished parts of the project.

##### Lack of understanding of the consequences of technical debt

Sometimes your employer might not understand that technical debt has â€œinterestâ€ insofar as it slows down the pace of development as debt accumulates. This can make it too difficult to dedicate the teamâ€™s time to refactoring because management doesnâ€™t see the value of it.

##### Failing to combat the strict coherence of components

This is when the project resembles a monolith rather than the product of individual modules. In this case, any changes to one part of the project will affect others. Team development is made more difficult because itâ€™s difficult to isolate the work of individual members.

##### Lack of tests 

The lack of immediate feedback encourages quick, but risky workarounds or kludges. In worst cases, these changes are implemented and deployed right into the production without any prior testing. The consequences can be catastrophic. For example, an innocent-looking hotfix might send a weird test email to thousands of customers or even worse, flush or corrupt an entire database.

##### Lack of documentation

This slows down the introduction of new people to the project and can grind development to a halt if key people leave the project.

##### Lack of interaction between team members

If the knowledge base isnâ€™t distributed throughout the company, people will end up working with an outdated understanding of processes and information about the project. This situation can be exacerbated when junior developers are incorrectly trained by their mentors.

##### Long-term simultaneous development in several branches

This can lead to the accumulation of technical debt, which is then increased when changes are merged. The more changes made in isolation, the greater the total technical debt.

##### Delayed refactoring

The projectâ€™s requirements are constantly changing and at some point it may become obvious that parts of the code are obsolete, have become cumbersome, and must be redesigned to meet new requirements.

On the other hand, the projectâ€™s programmers are writing new code every day that works with the obsolete parts. Therefore, the longer refactoring is delayed, the more dependent code will have to be reworked in the future.

##### Lack of compliance monitoring

This happens when everyone working on the project writes code as they see fit (i.e. the same way they wrote the last project).

##### Incompetence

This is when the developer just doesnâ€™t know how to write decent code.

### When to refactor

Rule of three:
- When youâ€™re doing something for the first time, just get it done.
- When youâ€™re doing something similar for the second time, cringe at having to repeat but do the same thing anyway.
- When youâ€™re doing something for the third time, start refactoring.

When adding a feature:
- Refactoring helps you understand other peopleâ€™s code. If you have to deal with someone elseâ€™s dirty code, try to refactor it first. Clean code is much easier to grasp. You will improve it not only for yourself but also for those who use it after you.
- Refactoring makes it easier to add new features. Itâ€™s much easier to make changes in clean code.

When fixing a bug:
- Bugs in code behave just like those in real life: they live in the darkest, dirtiest places in the code. Clean your code and the errors will practically discover themselves.
- Managers appreciate proactive refactoring as it eliminates the need for special refactoring tasks later. Happy bosses make happy programmers!

During a code review:
- The code review may be the last chance to tidy up the code before it becomes available to the public.
- Itâ€™s best to perform such reviews in a pair with an author. This way you could fix simple problems quickly and gauge the time for fixing the more difficult ones.

### How to refactor 

Refactoring should be done as a series of small changes, each of which makes the existing code slightly better while still leaving the program in working order.

#### Checklist of refactoring done right way
 
##### The code should become cleaner

If the code remains just as unclean after refactoring... well, Iâ€™m sorry, but youâ€™ve just wasted an hour of your life. Try to figure out why this happened.

It frequently happens when you move away from refactoring with small changes and mix a whole bunch of refactorings into one big change. So itâ€™s very easy to lose your mind, especially if you have a time limit.

But it can also happen when working with extremely sloppy code. Whatever you improve, the code as a whole remains a disaster.

In this case, itâ€™s worthwhile to think about completely rewriting parts of the code. But before that, you should have written tests and set aside a good chunk of time. Otherwise, youâ€™ll end up with the kinds of results we talked about in the first paragraph.

##### New functionality shouldnâ€™t be created during refactoring.

Donâ€™t mix refactoring and direct development of new features. Try to separate these processes at least within the confines of individual commits.

##### All existing tests must pass after refactoring.

There are two cases when tests can break down after refactoring:
- **You made an error during refactoring**. This one is a no-brainer: go ahead and fix the error.
- **Your tests were too low-level**. For example, you were testing private methods of classes.

In this case, the tests are to blame. You can either refactor the tests themselves or write an entirely new set of higher-level tests. A great way to avoid this kind of a situation is to write BDD-style tests.

## Catalog of refactoring 

### Code smells

#### Bloaters

Bloaters are code, methods and classes that have increased to such gargantuan proportions that theyâ€™re hard to work with. Usually these smells donâ€™t crop up right away, rather they accumulate over time as the program evolves (and especially when nobody makes an effort to eradicate them).

##### Long Method

A method contains too many lines of code. Generally, any method longer than ten lines should make you start asking questions.

##### Large class

A class contains many fields/methods/lines of code

##### Primitive obsession

- Use of primitives instead of small objects for simple tasks (such as currency, ranges, special strings for phone numbers, etc.)
- Use of constants for coding information (such as a constant `USER_ADMIN_ROLE = 1` for referring to users with administrator rights.)
- Use of string constants as field names for use in data arrays.

##### Long parameter list

More than three or four parameters for a method

##### Data clumps

Sometimes different parts of the code contain identical groups of variables (such as parameters for connecting to a database). These clumps should be turned into their own classes.

#### Object-Orientation Abusers

All these smells are incomplete or incorrect application of object-oriented programming principles.

##### Switch Statements

You have a complex switch operator or sequence of if statements.

##### Temporary Field

Temporary fields get their values (and thus are needed by objects) only under certain circumstances. Outside of these circumstances, theyâ€™re empty.

##### Refused Bequest

If a subclass uses only some of the methods and properties inherited from its parents, the hierarchy is off-kilter. The unneeded methods may simply go unused or be redefined and give off exceptions.

##### Alternative classes with different interfaces

Two classes perform identical functions but have different method names.

#### Change preventers

These smells mean that if you need to change something in one place in your code, you have to make many changes in other places too. Program development becomes much more complicated and expensive as a result.

##### Divergent Change

You find yourself having to change many unrelated methods when you make changes to a class. For example, when adding a new product type you have to change the methods for finding, displaying, and ordering products.

##### Shotgun Surgery

Making any modifications requires that you make many small changes to many different classes.

##### Parallel Inheritance Hierarchies

Whenever you create a subclass for a class, you find yourself needing to create a subclass for another class.

#### Dispensables

A dispensable is something pointless and unneeded whose absence would make the code cleaner, more efficient and easier to understand.

##### Comments

A method is filled with explanatory comments.

##### Duplicate code

Two code fragments look almost identical.

##### Lazy class

Understanding and maintaining classes always costs time and money. So if a class doesnâ€™t do enough to earn your attention, it should be deleted.

##### Data class 

A data class refers to a class that contains only fields and crude methods for accessing them (getters and setters). These are simply containers for data used by other classes. These classes donâ€™t contain any additional functionality and canâ€™t independently operate on the data that they own.

##### Dead Code

A variable, parameter, field, method or class is no longer used (usually because itâ€™s obsolete).

##### Speculative Generality

Thereâ€™s an unused class, method, field or parameter.

#### Couplers

All the smells in this group contribute to excessive coupling between classes or show what happens if coupling is replaced by excessive delegation.

##### Feature Envy

A method accesses the data of another object more than its own data.

##### Inappropriate Intimacy

One class uses the internal fields and methods of another class.

##### Message Chains 

In code you see a series of calls resembling `$a->b()->c()->d()`

##### Middle Man

If a class performs only one action, delegating work to another class, why does it exist at all?

#### Other Smells

Below are the smells which donâ€™t fall into any broad category.

##### Incomplete Library Class 

Sooner or later, libraries stop meeting user needs. The only solution to the problemâ€”changing the libraryâ€”is often impossible since the library is read-only.

### Refactoring Techniques

#### Composing Methods

Much of refactoring is devoted to correctly composing methods. In most cases, excessively long methods are the root of all evil. The vagaries of code inside these methods conceal the execution logic and make the method extremely hard to understandâ€”and even harder to change.
The refactoring techniques in this group streamline methods, remove code duplication, and pave the way for future improvements.

##### Extract Method 

**Problem** : You have a code fragment that can be grouped together.
**Solution**: Move this code to a separate new method (or function) and replace the old code with a call to the method.

##### Inline Method

**Problem**: When a method body is more obvious than the method itself, use this technique.
**Solution**: Replace calls to the method with the methodâ€™s content and delete the method itself.

##### Extract Variable

**Problem**: You have an expression thatâ€™s hard to understand.
**Solution**: Place the result of the expression or its parts in separate variables that are self-explanatory.

##### Inline Temp 

**Problem**: You have a temporary variable thatâ€™s assigned the result of a simple expression and nothing more.
**Solution** Replace the references to the variable with the expression itself.

##### Replace Temp with Query

**Problem**: You place the result of an expression in a local variable for later use in your code.
**Solution**: Move the entire expression to a separate method and return the result from it. Query the method instead of using a variable. Incorporate the new method in other methods, if necessary.

##### Split Temporary Variable

**Problem**: You have a local variable thatâ€™s used to store various intermediate values inside a method (except for cycle variables).
**Solution**: Use different variables for different values. Each variable should be responsible for only one particular thing.

##### Remove assignments to parameters

**Problem**: Some value is assigned to a parameter inside method's body
**Solution**: Use a local variable instead of a parameter.

##### Replace method with method object

**Problem**: You have a long method in which the local variables are so intertwined that you canâ€™t apply Extract Method.
**Solution**: Transform the method into a separate class so that the local variables become fields of the class. Then you can split the method into several methods within the same class.

##### Substitute Algorithm

**Problem**: So you want to replace an existing algorithm with a new one ?
**Solution**: Replace the body of method that implements the algorithm with a new algorithm.

#### Moving Features between Objects

Even if you have distributed functionality among different classes in a less-than-perfect way, thereâ€™s still hope.
These refactoring techniques show how to safely move functionality between classes, create new classes, and hide implementation details from public access.

##### Move method

**Problem**: A method is used more in another class than in its own class.
**Solution**: Create a new method in the class that uses the method the most, then move code from the old method to there. Turn the code of the original method into a reference to the new method in the other class or else remove it entirely.

##### Move field

**Problem**: A field is used more in another class than in its own class. 
**Solution**: Create a field in a new class and redirect all users of the old field to it.

##### Extract Class

**Problem**: When one class does the work of two, awkwardness results.
**Solution**: Instead, create a new class and place the fields and methods responsible for the relevant functionality in it.

##### Inline Class

**Problem**: A class does almost nothing and isnâ€™t responsible for anything, and no additional responsibilities are planned for it.
**Solution**: Move all features from the class to another one.

##### Hide Delegate

**Problem**: The client gets object B from a field or method of object Ð. Then the client calls a method of object B.
**Solution**: Create a new method in class A that delegates the call to object B. Now the client doesnâ€™t know about, or depend on, class B.

##### Remove Middle Man

**Problem**: A class has too many methods that simply delegate to other objects.
**Solution**: Delete these methods and force the client to call the end methods directly.

##### Introduce Foreign Method

**Problem**: A utility class doesnâ€™t contain the method that you need and you canâ€™t add the method to the class.
**Solution**: Add the method to a client class and pass an object of the utility class to it as an argument.

##### Introduce Local Extension

**Problem**: A utility class doesnâ€™t contain some methods that you need. But you canâ€™t add these methods to the class.
**Solution**: Create a new class containing the methods and make it either the child or wrapper of the utility class.


#### Organizing Data

These refactoring techniques help with data handling, replacing primitives with rich class functionality.
Another important result is untangling of class associations, which makes classes more portable and reusable.

##### Self Encapsulate Field

**Problem**: You use direct access to private fields inside a class.
**Solution**: Create a getter and setter for the field, and use only them for accessing the field.

##### Replace Data Value with Object

**Problem**: A class (or group of classes) contains a data field. The field has its own behavior and associated data.
**Solution**: Create a new class, place the old field and its behavior in the class, and store the object of the class in the original class.

##### Change Value to Reference

**Problem**: So you have many identical instances of a single class that you need to replace with a single object.
**Solution**: Convert the identical objects to a single reference object.

##### Change Reference to Value

**Problem**: You have a reference object thatâ€™s too small and infrequently changed to justify managing its life cycle.
**Solution**: Turn it into a value object.

##### Replace Array with Object

**Problem**: You have an array that contains various types of data.
**Solution**: Replace the array with an object that will have separate fields for each element.

##### Duplicate Observed Data

**Problem**: Is domain data stored in classes responsible for the GUI?
**Solution**: Then itâ€™s a good idea to separate the data into separate classes, ensuring connection and synchronization between the domain class and the GUI.

##### Change Unidirectional Association to Bidirectional

**Problem**: You have two classes that each need to use the features of the other, but the association between them is only unidirectional.
**Solution**: Add the missing association to the class that needs it.

##### Change Bidirectional Association to Unidirectional

**Problem**: You have a bidirectional association between classes, but one of the classes doesnâ€™t use the otherâ€™s features.
**Solution**: Remove the unused association.

##### Replace Magic Number with Symbolic Constant

**Problem**: Your code uses a number that has a certain meaning to it.
**Solution**: Replace this number with a constant that has a human-readable name explaining the meaning of the number.

##### Encapsulate Field

**Problem**: You have a public field.
**Solution**: Make the field private and create access methods for it.

##### Encapsulate Collection

**Problem**: A class contains a collection field and a simple getter and setter for working with the collection.
**Solution**: Make the getter-returned value read-only and create methods for adding/deleting elements of the collection.

##### Replace Type Code with Class

**Problem**: A class has a field that contains type code. The values of this type arenâ€™t used in operator conditions and donâ€™t affect the behavior of the program.
**Solution**: Create a new class and use its objects instead of the type code values.

##### Replace Type Code with Subclasses

**Problem**: You have a coded type that directly affects program behavior (values of this field trigger various code in conditionals).
**Solution**: Create subclasses for each value of the coded type. Then extract the relevant behaviors from the original class to these subclasses. Replace the control flow code with polymorphism.

##### Replace Type Code with State/Strategy

**Problem**: You have a coded type that affects behavior but you canâ€™t use subclasses to get rid of it.
**Solution**: Replace type code with a state object. If itâ€™s necessary to replace a field value with type code, another state object is â€œplugged inâ€.

##### Replace Subclass with Fields

**Problem**: You have subclasses differing only in their (constant-returning) methods.
**Solution**: Replace the methods with fields in the parent class and delete the subclasses.

#### Simplifying Conditional Expressions
Conditionals tend to get more and more complicated in their logic over time, and there are yet more techniques to combat this as well.

##### Decompose Conditional

**Problem**: You have a complex conditional (if-then/else or switch).
**Solution**: Decompose the complicated parts of the conditional into separate methods: the condition, then and else.

##### Consolidate Conditional Expression

**Problem**: You have multiple conditionals that lead to the same result or action.
**Solution**: Consolidate all these conditionals in a single expression.

##### Consolidate Duplicate Conditional Fragments

**Problem**: Identical code can be found in all branches of a conditional.
**Solution**: Move the code outside of the conditional.

##### Remove Control Flag

**Problem**: You have a boolean variable that acts as a control flag for multiple boolean expressions.
**Solution**: Instead of the variable, use break, continue and return.

##### Replace Nested Conditional with Guard Clauses

**Problem**: You have a group of nested conditionals and itâ€™s hard to determine the normal flow of code execution.
**Solution**: Isolate all special checks and edge cases into separate clauses and place them before the main checks. Ideally, you should have a â€œflatâ€ list of conditionals, one after the other.

##### Replace Conditional with Polymorphism

**Problem**: You have a conditional that performs various actions depending on object type or properties.
**Solution**: Create subclasses matching the branches of the conditional. In them, create a shared method and move code from the corresponding branch of the conditional to it. Then replace the conditional with the relevant method call. The result is that the proper implementation will be attained via polymorphism depending on the object class.

##### Introduce Null Object

**Problem**: Since some methods return null instead of real objects, you have many checks for null in your code.
**Solution**: Instead of null, return a null object that exhibits the default behavior.

##### Introduce Assertion

**Problem**: For a portion of code to work correctly, certain conditions or values must be true.
**Solution**: Replace these assumptions with specific assertion checks.

#### Simplifying Method Calls
These techniques make method calls simpler and easier to understand. This, in turn, simplifies the interfaces for interaction between classes.

##### Rename Method

**Problem**: The name of a method doesnâ€™t explain what the method does.
**Solution**: Rename the method.

##### Add Parameter

**Problem**: A method doesnâ€™t have enough data to perform certain actions.
**Solution**: Create a new parameter to pass the necessary data.

##### Remove Parameter

**Problem**: A parameter isnâ€™t used in the body of a method.
**Solution**: Remove the unused parameter.

##### Separate Query from Modifier

**Problem**: Do you have a method that returns a value but also changes something inside an object?
**Solution**: Split the method into two separate methods. As you would expect, one of them should return the value and the other one modifies the object.

##### Parameterize Method

**Problem**: Multiple methods perform similar actions that are different only in their internal values, numbers or operations.
**Solution**: Combine these methods by using a parameter that will pass the necessary special value.

##### Replace Parameter with Explicit Methods

**Problem**: A method is split into parts, each of which is run depending on the value of a parameter.
**Solution**: Extract the individual parts of the method into their own methods and call them instead of the original method.

##### Preserve Whole Object

**Problem**: You get several values from an object and then pass them as parameters to a method.
**Solution**: Instead, try passing the whole object.

##### Replace Parameter with Method Call

**Problem**: Calling a query method and passing its results as the parameters of another method, while that method could call the query directly.
**Solution**: Instead of passing the value through a parameter, try placing a query call inside the method body.

##### Introduce Parameter Object

**Problem**: Your methods contain a repeating group of parameters.
**Solution**: Replace these parameters with an object.

##### Remove Setting Method

**Problem**: The value of a field should be set only when itâ€™s created, and not change at any time after that.
**Solution**: So remove methods that set the fieldâ€™s value.

##### Hide Method

**Problem**: A method isnâ€™t used by other classes or is used only inside its own class hierarchy.
**Solution**: Make the method private or protected.

##### Replace Constructor with Factory Method

**Problem**: You have a complex constructor that does something more than just setting parameter values in object fields.
**Solution**: Create a factory method and use it to replace constructor calls.

##### Replace Error Code with Exception

**Problem**: A method returns a special value that indicates an error?
**Solution**: Throw an exception instead.

##### Replace Exception with Test

**Problem**: You throw an exception in a place where a simple test would do the job?
**Solution**: Replace the exception with a condition test.

#### Dealing with Generalization

Abstraction has its own group of refactoring techniques, primarily associated with moving functionality along the class inheritance hierarchy, creating new classes and interfaces, and replacing inheritance with delegation and vice versa.

##### Pull Up Field

**Problem**: Two classes have the same field.
**Solution**: Remove the field from subclasses and move it to the superclass.

##### Pull Up Method

**Problem**: Your subclasses have methods that perform similar work.
**Solution**: Make the methods identical and then move them to the relevant superclass.

##### Pull Up Constructor Body

**Problem**: Your subclasses have constructors with code thatâ€™s mostly identical.
**Solution**: Create a superclass constructor and move the code thatâ€™s the same in the subclasses to it. Call the superclass constructor in the subclass constructors.

##### Push Down Method

**Problem**: Is behavior implemented in a superclass used by only one (or a few) subclasses?
**Solution**: Move this behavior to the subclasses.

##### Push Down Field

**Problem**: Is a field used only in a few subclasses?
**Solution**: Move the field to these subclasses.

##### Extract Subclass

**Problem**: A class has features that are used only in certain cases.
**Solution**: Create a subclass and use it in these cases.

##### Extract Superclass

**Problem**: You have two classes with common fields and methods.
**Solution**: Create a shared superclass for them and move all the identical fields and methods to it.

##### Extract Interface

**Problem**: Multiple clients are using the same part of a class interface. Another case: part of the interface in two classes is the same.
**Solution**: Move this identical portion to its own interface.

##### Collapse Hierarchy

**Problem**: You have a class hierarchy in which a subclass is practically the same as its superclass.
**Solution**: Merge the subclass and superclass.

##### Form Template Method

**Problem**: Your subclasses implement algorithms that contain similar steps in the same order.
**Solution**: Move the algorithm structure and identical steps to a superclass, and leave implementation of the different steps in the subclasses.

##### Replace Inheritance with Delegation

**Problem**: You have a subclass that uses only a portion of the methods of its superclass (or itâ€™s not possible to inherit superclass data).
**Solution**: Create a field and put a superclass object in it, delegate methods to the superclass object, and get rid of inheritance.

##### Replace Delegation with Inheritance

**Problem**: A class contains many simple methods that delegate to all methods of another class.
**Solution**: Make the class a delegate inheritor, which makes the delegating methods unnecessary.

