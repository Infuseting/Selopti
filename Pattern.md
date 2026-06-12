# Design Patterns
## What is a pattern
### What's a design pattern ?

Design patterns are typical solutions to commonly occurring problems in software design. They are like pre-made blueprints that you can customize to solve a recurring design problem in your code.

You canâ€™t just find a pattern and copy it into your program, the way you can with off-the-shelf functions or libraries. The pattern is not a specific piece of code, but a general concept for solving a particular problem. You can follow the pattern details and implement a solution that suits the realities of your own program.

Patterns are often confused with algorithms, because both concepts describe typical solutions to some known problems. While an algorithm always defines a clear set of actions that can achieve some goal, a pattern is a more high-level description of a solution. The code of the same pattern applied to two different programs may be different.

An analogy to an algorithm is a cooking recipe: both have clear steps to achieve a goal. On the other hand, a pattern is more like a blueprint: you can see what the result and its features are, but the exact order of implementation is up to you.

### What does the pattern consist of ? 

Most patterns are described very formally so people can reproduce them in many contexts. Here are the sections that are usually present in a pattern description:

- **Intent** of the pattern briefly describes both the problem and the solution.
- **Motivation** further explains the problem and the solution the pattern makes possible.
- **Structure** of classes shows each part of the pattern and how they are related.
- **Code example** in one of the popular programming languages makes it easier to grasp the idea behind the pattern.

Some pattern catalogs list other useful details, such as applicability of the pattern, implementation steps and relations with other patterns.

### History of patterns

Who invented patterns? Thatâ€™s a good, but not a very accurate, question. Design patterns arenâ€™t obscure, sophisticated conceptsâ€”quite the opposite. Patterns are typical solutions to common problems in object-oriented design. When a solution gets repeated over and over in various projects, someone eventually puts a name to it and describes the solution in detail. Thatâ€™s basically how a pattern gets discovered.

The concept of patterns was first described by Christopher Alexander in A Pattern Language: Towns, Buildings, Construction. The book describes a â€œlanguageâ€ for designing the urban environment. The units of this language are patterns. They may describe how high windows should be, how many levels a building should have, how large green areas in a neighborhood are supposed to be, and so on.

The idea was picked up by four authors: Erich Gamma, John Vlissides, Ralph Johnson, and Richard Helm. In 1994, they published Design Patterns: Elements of Reusable Object-Oriented Software, in which they applied the concept of design patterns to programming. The book featured 23 patterns solving various problems of object-oriented design and became a best-seller very quickly. Due to its lengthy name, people started to call it â€œthe book by the gang of fourâ€ which was soon shortened to simply â€œthe GoF bookâ€.

Since then, dozens of other object-oriented patterns have been discovered. The â€œpattern approachâ€ became very popular in other programming fields, so lots of other patterns now exist outside of object-oriented design as well.

### Why should i learn patterns ?

The truth is that you might manage to work as a programmer for many years without knowing about a single pattern. A lot of people do just that. Even in that case, though, you might be implementing some patterns without even knowing it. So why would you spend time learning them?

- Design patterns are a toolkit of tried and tested solutions to common problems in software design. Even if you never encounter these problems, knowing patterns is still useful because it teaches you how to solve all sorts of problems using principles of object-oriented design.

- Design patterns define a common language that you and your teammates can use to communicate more efficiently. You can say, â€œOh, just use a Singleton for that,â€ and everyone will understand the idea behind your suggestion. No need to explain what a singleton is if you know the pattern and its name.

### Criticism of patterns

It seems like only lazy people havenâ€™t criticized design patterns yet. Letâ€™s take a look at the most typical arguments against using patterns.

#### Kludges for a weak programming language

Usually the need for patterns arises when people choose a programming language or a technology that lacks the necessary level of abstraction. In this case, patterns become a kludge that gives the language much-needed super-abilities.

For example, the Strategy pattern can be implemented with a simple anonymous (lambda) function in most modern programming languages.

#### Inefficient solutions

Patterns try to systematize approaches that are already widely used. This unification is viewed by many as a dogma, and they implement patterns â€œto the letterâ€, without adapting them to the context of their project.

#### Unjustified use

This is the problem that haunts many novices who have just familiarized themselves with patterns. Having learned about patterns, they try to apply them everywhere, even in situations where simpler code would do just fine.

### Classification of patterns 

Design patterns differ by their complexity, level of detail and scale of applicability to the entire system being designed. I like the analogy to road construction: you can make an intersection safer by either installing some traffic lights or building an entire multi-level interchange with underground passages for pedestrians.

The most basic and low-level patterns are often called idioms. They usually apply only to a single programming language.

The most universal and high-level patterns are architectural patterns. Developers can implement these patterns in virtually any language. Unlike other patterns, they can be used to design the architecture of an entire application.

In addition, all patterns can be categorized by their intent, or purpose. This book covers three main groups of patterns:

- **Creational patterns** provide object creation mechanisms that increase flexibility and reuse of existing code.

- **Structural patterns** explain how to assemble objects and classes into larger structures, while keeping these structures flexible and efficient.

- **Behavioral patterns** take care of effective communication and the assignment of responsibilities between objects.

## The catalog of Design patterns

### Creational patterns

These patterns provide various object creation mechanisms, which increase flexibility and reuse of existing code.



#### Factory Method

> Also known as: **Virtual Constructor**

**Intent**

Factory Method is a creational design pattern that provides an interface for creating objects in a superclass, but allows subclasses to alter the type of objects that will be created.

**Problem**

Imagine you're creating a logistics management application. The first version only handles transportation by trucks. Later, sea transportation companies ask you to support sea logistics. At present, most of your code is coupled to the `Truck` class. Adding `Ships` into the app would require changes everywhere, and any new transportation type would force you to repeat all those changes.

**Solution**

The Factory Method pattern suggests replacing direct object construction calls (`new`) with calls to a special factory method. Objects returned by a factory method are often referred to as **products**. Subclasses can override the factory method to change the class of objects being returned.

**Structure**

1. **Product** â€” declares the interface common to all objects that can be produced.
2. **Concrete Products** â€” different implementations of the product interface.
3. **Creator** â€” declares the factory method that returns new product objects. Its primary responsibility is NOT creating products but containing core business logic.
4. **Concrete Creators** â€” override the factory method to return different types of products.

**When to use**

- When you don't know beforehand the exact types and dependencies of objects your code should work with.
- When you want to provide users of your library with a way to extend its internal components.
- When you want to reuse existing objects instead of rebuilding them each time.

**Pros and Cons**

âœ… Avoids tight coupling between creator and concrete products.  
âœ… Single Responsibility Principle â€” product creation code in one place.  
âœ… Open/Closed Principle â€” introduce new product types without breaking existing code.  
âŒ Code may become more complicated as many new subclasses are needed.

**Java Example**

```java
// Product interface
interface Button {
    void render();
    void onClick();
}

// Concrete Products
class HtmlButton implements Button {
    public void render() {
        System.out.println("<button>Test Button</button>");
    }
    public void onClick() {
        System.out.println("Click! Button says - 'Hello World!'");
    }
}

class WindowsButton implements Button {
    public void render() {
        System.out.println("Rendering Windows-style button");
    }
    public void onClick() {
        System.out.println("Windows click event");
    }
}

// Creator (abstract)
abstract class Dialog {
    public void renderWindow() {
        Button okButton = createButton(); // factory method call
        okButton.render();
    }
    public abstract Button createButton(); // factory method
}

// Concrete Creators
class HtmlDialog extends Dialog {
    @Override
    public Button createButton() {
        return new HtmlButton();
    }
}

class WindowsDialog extends Dialog {
    @Override
    public Button createButton() {
        return new WindowsButton();
    }
}

// Client
public class Demo {
    private static Dialog dialog;

    public static void main(String[] args) {
        String os = System.getProperty("os.name").toLowerCase();
        if (os.contains("windows")) {
            dialog = new WindowsDialog();
        } else {
            dialog = new HtmlDialog();
        }
        dialog.renderWindow();
    }
}
```



#### Abstract Factory

**Intent**

Abstract Factory is a creational design pattern that lets you produce families of related objects without specifying their concrete classes.

**Problem**

Imagine creating a furniture shop simulator. Your code has classes representing a family of related products: `Chair`, `Sofa`, `CoffeeTable`. Each family exists in several variants: `Modern`, `Victorian`, `ArtDeco`. You need a way to create individual furniture objects so they match other objects of the same family, and you don't want to change existing code when adding new products or families.

**Solution**

Explicitly declare interfaces for each distinct product of the product family. Then declare the **Abstract Factory** â€” an interface with a list of creation methods for all products of the family. For each variant, create a separate factory class. The client code works with both factories and products via abstract interfaces, making it independent from concrete implementations.

**Structure**

1. **Abstract Products** â€” interfaces for a set of distinct but related products.
2. **Concrete Products** â€” various implementations of abstract products, grouped by variants.
3. **Abstract Factory** â€” interface declaring creation methods for each abstract product.
4. **Concrete Factories** â€” implement the abstract factory, each corresponding to one product variant.
5. **Client** â€” works with factories and products only through abstract interfaces.

**When to use**

- When your code needs to work with various families of related products without depending on their concrete classes.
- When a class has a set of Factory Methods that blur its primary responsibility.

**Pros and Cons**

âœ… Products from a factory are guaranteed to be compatible with each other.  
âœ… Avoids tight coupling between concrete products and client code.  
âœ… Single Responsibility + Open/Closed Principles.  
âŒ Code may become more complicated since many new interfaces and classes are introduced.

**Java Example**

```java
// Abstract products
interface Button { void paint(); }
interface Checkbox { void paint(); }

// Concrete products â€” Windows variant
class WindowsButton implements Button {
    public void paint() { System.out.println("You have created WindowsButton."); }
}
class WindowsCheckbox implements Checkbox {
    public void paint() { System.out.println("You have created WindowsCheckbox."); }
}

// Concrete products â€” MacOS variant
class MacOSButton implements Button {
    public void paint() { System.out.println("You have created MacOSButton."); }
}
class MacOSCheckbox implements Checkbox {
    public void paint() { System.out.println("You have created MacOSCheckbox."); }
}

// Abstract factory
interface GUIFactory {
    Button createButton();
    Checkbox createCheckbox();
}

// Concrete factories
class WindowsFactory implements GUIFactory {
    public Button createButton() { return new WindowsButton(); }
    public Checkbox createCheckbox() { return new WindowsCheckbox(); }
}

class MacOSFactory implements GUIFactory {
    public Button createButton() { return new MacOSButton(); }
    public Checkbox createCheckbox() { return new MacOSCheckbox(); }
}

// Client â€” works only with abstract interfaces
class Application {
    private Button button;
    private Checkbox checkbox;

    public Application(GUIFactory factory) {
        button = factory.createButton();
        checkbox = factory.createCheckbox();
    }

    public void paint() {
        button.paint();
        checkbox.paint();
    }
}

// Demo
public class Demo {
    public static void main(String[] args) {
        GUIFactory factory;
        String osName = System.getProperty("os.name").toLowerCase();
        if (osName.contains("mac")) {
            factory = new MacOSFactory();
        } else {
            factory = new WindowsFactory();
        }
        Application app = new Application(factory);
        app.paint();
    }
}
```



#### Builder

**Intent**

Builder is a creational design pattern that lets you construct complex objects step by step. The pattern allows you to produce different types and representations of an object using the same construction code.

**Problem**

Imagine a complex `House` object requiring laborious initialization of many fields (walls, floors, doors, windows, roof, heating, plumbing, etc.). The simplest solution â€” a giant constructor with all possible parameters â€” leads to ugly calls where most parameters are unused most of the time (the "telescoping constructor" anti-pattern).

**Solution**

Extract the object construction code into separate objects called **builders**. Each builder implements the same set of building steps, but in a different manner. A **Director** class optionally defines the order in which to call the construction steps, encapsulating the most common construction routines.

**Structure**

1. **Builder interface** â€” declares product construction steps common to all builders.
2. **Concrete Builders** â€” provide different implementations of the construction steps.
3. **Products** â€” the resulting objects. They don't have to belong to the same class hierarchy.
4. **Director** â€” defines the order in which to call construction steps.
5. **Client** â€” associates a builder with a director and gets the result from the builder.

**When to use**

- To get rid of a "telescoping constructor".
- When you want your code to create different representations of some product.
- To construct Composite trees or other complex objects step by step.

**Pros and Cons**

âœ… Construct objects step-by-step, defer or run steps recursively.  
âœ… Reuse the same construction code for various representations.  
âœ… Single Responsibility Principle.  
âŒ Overall complexity increases since the pattern requires creating multiple new classes.

**Java Example**

```java
// Product
class Car {
    private String type;
    private int seats;
    private String engine;
    private String transmission;

    public Car(String type, int seats, String engine, String transmission) {
        this.type = type; this.seats = seats;
        this.engine = engine; this.transmission = transmission;
    }

    @Override
    public String toString() {
        return "Car [type=" + type + ", seats=" + seats +
               ", engine=" + engine + ", transmission=" + transmission + "]";
    }
}

// Builder interface
interface Builder {
    void setCarType(String type);
    void setSeats(int seats);
    void setEngine(String engine);
    void setTransmission(String transmission);
}

// Concrete Builder
class CarBuilder implements Builder {
    private String type;
    private int seats;
    private String engine;
    private String transmission;

    public void setCarType(String type) { this.type = type; }
    public void setSeats(int seats) { this.seats = seats; }
    public void setEngine(String engine) { this.engine = engine; }
    public void setTransmission(String transmission) { this.transmission = transmission; }

    public Car getResult() {
        return new Car(type, seats, engine, transmission);
    }
}

// Director
class Director {
    public void constructSportsCar(Builder builder) {
        builder.setCarType("SPORTS_CAR");
        builder.setSeats(2);
        builder.setEngine("3.0L V6");
        builder.setTransmission("SEMI_AUTOMATIC");
    }

    public void constructSUV(Builder builder) {
        builder.setCarType("SUV");
        builder.setSeats(4);
        builder.setEngine("2.5L I4");
        builder.setTransmission("MANUAL");
    }
}

// Demo
public class Demo {
    public static void main(String[] args) {
        Director director = new Director();
        CarBuilder builder = new CarBuilder();

        director.constructSportsCar(builder);
        Car car = builder.getResult();
        System.out.println("Car built: " + car);

        director.constructSUV(builder);
        Car suv = builder.getResult();
        System.out.println("SUV built: " + suv);
    }
}
```



#### Prototype

> Also known as: **Clone**

**Intent**

Prototype is a creational design pattern that lets you copy existing objects without making your code dependent on their classes.

**Problem**

To create an exact copy of an object, you must know its class, creating a dependency. Worse, some fields may be private and inaccessible. You might only know the interface that the object follows, not its concrete class.

**Solution**

The Prototype pattern delegates the cloning process to the actual objects. The pattern declares a common interface for all objects that support cloning â€” usually just a single `clone()` method. An object that supports cloning is called a **prototype**. When your objects have dozens of fields and hundreds of possible configurations, cloning them serves as an alternative to subclassing.

**Structure**

1. **Prototype interface** â€” declares the `clone()` method.
2. **Concrete Prototype** â€” implements the cloning method, copying all field values including private ones.
3. **Client** â€” can produce a copy of any object that follows the prototype interface.
4. **Prototype Registry** (optional) â€” stores a set of pre-built prototypes in a `name â†’ prototype` map.

**When to use**

- When your code shouldn't depend on the concrete classes of objects you need to copy.
- When you want to reduce the number of subclasses that only differ in the way they initialize their objects.

**Pros and Cons**

âœ… Clone objects without coupling to their concrete classes.  
âœ… Eliminate repeated initialization code by cloning pre-built prototypes.  
âœ… Alternative to inheritance for configuration presets.  
âŒ Cloning complex objects with circular references can be tricky.

**Java Example**

```java
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

abstract class Shape {
    public int x;
    public int y;
    public String color;

    public Shape() {}

    public Shape(Shape target) {
        if (target != null) {
            this.x = target.x;
            this.y = target.y;
            this.color = target.color;
        }
    }

    public abstract Shape clone();

    @Override
    public boolean equals(Object object2) {
        if (!(object2 instanceof Shape)) return false;
        Shape shape2 = (Shape) object2;
        return shape2.x == x && shape2.y == y && Objects.equals(shape2.color, color);
    }
}

class Circle extends Shape {
    public int radius;

    public Circle() {}

    public Circle(Circle target) {
        super(target);
        if (target != null) this.radius = target.radius;
    }

    @Override
    public Shape clone() { return new Circle(this); }

    @Override
    public boolean equals(Object object2) {
        if (!(object2 instanceof Circle) || !super.equals(object2)) return false;
        return ((Circle) object2).radius == radius;
    }
}

class Rectangle extends Shape {
    public int width;
    public int height;

    public Rectangle() {}

    public Rectangle(Rectangle target) {
        super(target);
        if (target != null) {
            this.width = target.width;
            this.height = target.height;
        }
    }

    @Override
    public Shape clone() { return new Rectangle(this); }

    @Override
    public boolean equals(Object object2) {
        if (!(object2 instanceof Rectangle) || !super.equals(object2)) return false;
        Rectangle r = (Rectangle) object2;
        return r.width == width && r.height == height;
    }
}

public class Demo {
    public static void main(String[] args) {
        List<Shape> shapes = new ArrayList<>();

        Circle circle = new Circle();
        circle.x = 10; circle.y = 20; circle.radius = 15; circle.color = "red";
        shapes.add(circle);
        shapes.add((Circle) circle.clone()); // clone

        Rectangle rect = new Rectangle();
        rect.width = 10; rect.height = 20; rect.color = "blue";
        shapes.add(rect);

        List<Shape> shapesCopy = new ArrayList<>();
        for (Shape s : shapes) shapesCopy.add(s.clone());

        for (int i = 0; i < shapes.size(); i++) {
            System.out.println(i + ": different objects? " + (shapes.get(i) != shapesCopy.get(i)));
            System.out.println(i + ": equal content? " + shapes.get(i).equals(shapesCopy.get(i)));
        }
    }
}
```



#### Singleton

**Intent**

Singleton is a creational design pattern that lets you ensure that a class has only one instance, while providing a global access point to this instance.

**Problem**

The Singleton pattern solves two problems simultaneously (violating Single Responsibility Principle):
1. **Ensure a single instance** â€” controlling access to a shared resource (e.g., a database connection).
2. **Provide a global access point** â€” like global variables, but protected from being overwritten by other code.

**Solution**

- Make the default constructor **private** to prevent direct `new` calls.
- Create a **static creation method** that acts as a constructor: it calls the private constructor on first use, stores the instance in a static field, and returns the cached instance on all subsequent calls.

**Structure**

1. **Singleton class** â€” declares the static `getInstance()` method that always returns the same instance.

**When to use**

- When a class should have just a single instance available to all clients (e.g., a shared database object).
- When you need stricter control over global variables.

**Pros and Cons**

âœ… Guaranteed single instance.  
âœ… Global access point.  
âœ… Initialized only when first requested (lazy).  
âŒ Violates Single Responsibility Principle.  
âŒ Can mask bad design (components knowing too much about each other).  
âŒ Requires special treatment in multithreaded environments.  
âŒ Difficult to unit test.

**Java Example**

```java
// Thread-safe Singleton using double-checked locking
public final class Database {
    // volatile ensures correct visibility across threads
    private static volatile Database instance;

    public String query;

    private Database() {
        // Slow initialization simulation
        try { Thread.sleep(100); } catch (InterruptedException e) { e.printStackTrace(); }
    }

    public static Database getInstance() {
        Database result = instance;
        if (result != null) return result;

        synchronized (Database.class) {
            if (instance == null) {
                instance = new Database();
            }
            return instance;
        }
    }

    public void executeQuery(String sql) {
        System.out.println("Executing: " + sql);
    }
}

public class Demo {
    public static void main(String[] args) throws InterruptedException {
        Thread t1 = new Thread(() -> {
            Database db = Database.getInstance();
            db.executeQuery("SELECT * FROM users");
        });
        Thread t2 = new Thread(() -> {
            Database db = Database.getInstance();
            db.executeQuery("SELECT * FROM orders");
        });
        t1.start(); t2.start();
        t1.join(); t2.join();

        // Both threads use the exact same instance
        System.out.println("Same instance? " + (Database.getInstance() == Database.getInstance()));
    }
}
```



### Structural Patterns

These patterns explain how to assemble objects and classes into larger structures while keeping these structures flexible and efficient.



#### Adapter

> Also known as: **Wrapper**

**Intent**

Adapter is a structural design pattern that allows objects with incompatible interfaces to collaborate.

**Problem**

Imagine creating a stock market monitoring app that downloads data in XML format and then integrates a third-party analytics library that only works with JSON. You can't use the library as-is, and you can't modify it either (no source code access).

**Solution**

Create an **adapter** â€” a special object that converts the interface of one object so that another can understand it. The adapter wraps one of the objects, hides the complexity of conversion, and the wrapped object isn't even aware of the adapter. You can create an XML-to-JSON adapter for every class of the analytics library your code uses directly.

**Structure (Object Adapter)**

1. **Client** â€” contains existing business logic.
2. **Client Interface** â€” describes the protocol other classes must follow.
3. **Service** â€” the useful but incompatible class (often 3rd-party).
4. **Adapter** â€” implements the client interface while wrapping the service object, translating calls between them.

**When to use**

- When you want to use an existing class, but its interface isn't compatible with the rest of your code.
- When you want to reuse several subclasses that lack some common functionality.

**Pros and Cons**

âœ… Single Responsibility Principle â€” interface/data conversion separated from business logic.  
âœ… Open/Closed Principle â€” introduce new adapters without breaking existing code.  
âŒ Overall complexity increases.

**Java Example**

```java
// The "round" world
class RoundHole {
    private double radius;
    public RoundHole(double radius) { this.radius = radius; }
    public double getRadius() { return radius; }
    public boolean fits(RoundPeg peg) { return getRadius() >= peg.getRadius(); }
}

class RoundPeg {
    private double radius;
    public RoundPeg(double radius) { this.radius = radius; }
    public double getRadius() { return radius; }
}

// Incompatible class
class SquarePeg {
    private double width;
    public SquarePeg(double width) { this.width = width; }
    public double getWidth() { return width; }
}

// Adapter: makes SquarePeg compatible with RoundHole
class SquarePegAdapter extends RoundPeg {
    private SquarePeg peg;

    public SquarePegAdapter(SquarePeg peg) {
        super(0); // superclass constructor required
        this.peg = peg;
    }

    @Override
    public double getRadius() {
        // The radius of the smallest circle that can accommodate the square peg
        return peg.getWidth() * Math.sqrt(2) / 2;
    }
}

public class Demo {
    public static void main(String[] args) {
        RoundHole hole = new RoundHole(5);
        RoundPeg rpeg = new RoundPeg(5);
        System.out.println("Round peg r=5 fits: " + hole.fits(rpeg)); // true

        SquarePeg smallSqPeg = new SquarePeg(5);
        SquarePeg largeSqPeg = new SquarePeg(10);

        SquarePegAdapter smallAdapter = new SquarePegAdapter(smallSqPeg);
        SquarePegAdapter largeAdapter = new SquarePegAdapter(largeSqPeg);

        System.out.println("Square peg w=5 fits: " + hole.fits(smallAdapter)); // true
        System.out.println("Square peg w=10 fits: " + hole.fits(largeAdapter)); // false
    }
}
```



#### Bridge

**Intent**

Bridge is a structural design pattern that lets you split a large class or a set of closely related classes into two separate hierarchies â€” **abstraction** and **implementation** â€” which can be developed independently of each other.

**Problem**

You have a `Shape` class with subclasses `Circle` and `Square`. You want to extend this hierarchy with colors (`Red`, `Blue`), which would force you to create `RedCircle`, `BlueCircle`, `RedSquare`, `BlueSquare` â€” a combinatorial explosion. Adding a new shape or color compounds the problem exponentially.

**Solution**

Extract the color dimension into a separate class hierarchy. The `Shape` class gets a reference field pointing to one of the color objects. Instead of multiplying subclasses, the `Shape` delegates color-related work to the linked `Color` object. This reference acts as the **bridge**. The two hierarchies can now evolve independently.

**Structure**

1. **Abstraction** â€” high-level control logic that relies on the implementation object.
2. **Implementation** â€” interface common to all concrete implementations.
3. **Concrete Implementations** â€” platform-specific code.
4. **Refined Abstractions** â€” variants of control logic.

**When to use**

- When you want to divide and organize a monolithic class with several variants of functionality.
- When you need to extend a class in several orthogonal (independent) dimensions.
- When you need to switch implementations at runtime.

**Pros and Cons**

âœ… Platform-independent classes and apps.  
âœ… Open/Closed + Single Responsibility Principles.  
âŒ May make code more complicated in cohesive classes.

**Java Example**

```java
// Implementation interface
interface Device {
    boolean isEnabled();
    void enable();
    void disable();
    int getVolume();
    void setVolume(int percent);
    int getChannel();
    void setChannel(int channel);
}

// Concrete Implementations
class Tv implements Device {
    private boolean on = false;
    private int volume = 30;
    private int channel = 1;

    public boolean isEnabled() { return on; }
    public void enable() { on = true; }
    public void disable() { on = false; }
    public int getVolume() { return volume; }
    public void setVolume(int v) { volume = v; }
    public int getChannel() { return channel; }
    public void setChannel(int c) { channel = c; }
}

// Abstraction
class RemoteControl {
    protected Device device;
    public RemoteControl(Device device) { this.device = device; }

    public void togglePower() {
        if (device.isEnabled()) device.disable();
        else device.enable();
    }
    public void volumeDown() { device.setVolume(device.getVolume() - 10); }
    public void volumeUp() { device.setVolume(device.getVolume() + 10); }
    public void channelDown() { device.setChannel(device.getChannel() - 1); }
    public void channelUp() { device.setChannel(device.getChannel() + 1); }
}

// Refined Abstraction
class AdvancedRemoteControl extends RemoteControl {
    public AdvancedRemoteControl(Device device) { super(device); }
    public void mute() { device.setVolume(0); }
}

public class Demo {
    public static void main(String[] args) {
        Tv tv = new Tv();
        RemoteControl remote = new RemoteControl(tv);
        remote.togglePower();
        remote.channelUp();
        System.out.println("TV on: " + tv.isEnabled() + ", channel: " + tv.getChannel());

        AdvancedRemoteControl advRemote = new AdvancedRemoteControl(tv);
        advRemote.mute();
        System.out.println("Volume after mute: " + tv.getVolume());
    }
}
```



#### Composite

> Also known as: **Object Tree**

**Intent**

Composite is a structural design pattern that lets you compose objects into tree structures and then work with these structures as if they were individual objects.

**Problem**

Imagine an ordering system with `Products` and `Boxes`. A `Box` can contain several `Products` and smaller `Boxes`. To determine the total price of an order, you need to know the classes of all objects, their nesting level, and other nasty details. A direct loop approach is awkward or impossible.

**Solution**

Work with `Products` and `Boxes` through a common interface with a `getPrice()` method. For a product, it returns the price. For a box, it iterates over each item, asks its price, and returns a total. This allows recursive traversal without caring about the concrete class of each object.

**Structure**

1. **Component interface** â€” common operations for both simple and complex elements.
2. **Leaf** â€” basic element with no sub-elements, does the actual work.
3. **Container (Composite)** â€” element with sub-elements (leaves or other containers). Delegates work to children and combines results.
4. **Client** â€” works with all elements through the component interface.

**When to use**

- When you have to implement a tree-like object structure.
- When you want client code to treat both simple and complex elements uniformly.

**Pros and Cons**

âœ… Work with complex tree structures using polymorphism and recursion.  
âœ… Open/Closed Principle â€” introduce new element types without breaking existing code.  
âŒ Difficult to provide a common interface for classes whose functionality differs too much.

**Java Example**

```java
import java.util.ArrayList;
import java.util.List;

// Component interface
interface Graphic {
    void move(int x, int y);
    void draw();
}

// Leaf
class Dot implements Graphic {
    protected int x, y;
    public Dot(int x, int y) { this.x = x; this.y = y; }
    public void move(int x, int y) { this.x += x; this.y += y; }
    public void draw() { System.out.println("Dot at (" + x + "," + y + ")"); }
}

// Another Leaf
class Circle extends Dot {
    private int radius;
    public Circle(int x, int y, int radius) { super(x, y); this.radius = radius; }
    public void draw() { System.out.println("Circle at (" + x + "," + y + ") r=" + radius); }
}

// Composite
class CompoundGraphic implements Graphic {
    private List<Graphic> children = new ArrayList<>();

    public void add(Graphic child) { children.add(child); }
    public void remove(Graphic child) { children.remove(child); }

    public void move(int x, int y) {
        for (Graphic child : children) child.move(x, y);
    }

    public void draw() {
        System.out.println("CompoundGraphic [");
        for (Graphic child : children) child.draw();
        System.out.println("]");
    }
}

public class Demo {
    public static void main(String[] args) {
        CompoundGraphic group = new CompoundGraphic();
        group.add(new Dot(1, 2));
        group.add(new Circle(5, 3, 10));

        CompoundGraphic all = new CompoundGraphic();
        all.add(new Dot(0, 0));
        all.add(group);

        all.move(1, 1);
        all.draw();
    }
}
```



#### Decorator

> Also known as: **Wrapper**

**Intent**

Decorator is a structural design pattern that lets you attach new behaviors to objects by placing these objects inside special wrapper objects that contain the behaviors.

**Problem**

A notification library initially sends emails. Users want SMS, Facebook, and Slack notifications too. Creating subclasses for every combination (`SMSFacebookNotifier`, etc.) causes a combinatorial explosion that bloats the code immensely.

**Solution**

Use **aggregation/composition** instead of inheritance. Leave the base email behavior inside the base `Notifier` class, and turn all other notification methods into decorators. All decorators implement the same interface as the base `Notifier`, so they can be stacked. The last decorator in the stack is the object the client actually works with.

**Structure**

1. **Component** â€” declares the common interface for both wrappers and wrapped objects.
2. **Concrete Component** â€” class of objects being wrapped, defines basic behavior.
3. **Base Decorator** â€” has a field referencing a wrapped object; delegates all operations to it.
4. **Concrete Decorators** â€” add extra behaviors; execute either before or after the wrapped object's call.
5. **Client** â€” wraps components in multiple layers of decorators.

**When to use**

- When you need to assign extra behaviors to objects at runtime without breaking existing code.
- When it's awkward or not possible to extend object behavior using inheritance (e.g., `final` classes).

**Pros and Cons**

âœ… Extend behavior without creating a new subclass.  
âœ… Add or remove responsibilities at runtime.  
âœ… Combine several behaviors by wrapping in multiple decorators.  
âŒ Hard to remove a specific wrapper from the stack.  
âŒ Order of decorators can matter.

**Java Example**

```java
// Component interface
interface DataSource {
    void writeData(String data);
    String readData();
}

// Concrete Component
class FileDataSource implements DataSource {
    private String filename;
    public FileDataSource(String filename) { this.filename = filename; }
    public void writeData(String data) { System.out.println("Writing to " + filename + ": " + data); }
    public String readData() { System.out.println("Reading from " + filename); return "raw data"; }
}

// Base Decorator
class DataSourceDecorator implements DataSource {
    protected DataSource wrappee;
    public DataSourceDecorator(DataSource source) { this.wrappee = source; }
    public void writeData(String data) { wrappee.writeData(data); }
    public String readData() { return wrappee.readData(); }
}

// Concrete Decorators
class EncryptionDecorator extends DataSourceDecorator {
    public EncryptionDecorator(DataSource source) { super(source); }
    public void writeData(String data) {
        String encrypted = "[ENCRYPTED:" + data + "]";
        wrappee.writeData(encrypted);
    }
    public String readData() {
        String data = wrappee.readData();
        return data.replace("[ENCRYPTED:", "").replace("]", ""); // simplified decrypt
    }
}

class CompressionDecorator extends DataSourceDecorator {
    public CompressionDecorator(DataSource source) { super(source); }
    public void writeData(String data) {
        String compressed = "[ZIP:" + data + "]";
        wrappee.writeData(compressed);
    }
}

public class Demo {
    public static void main(String[] args) {
        DataSource source = new FileDataSource("salary.dat");
        source = new CompressionDecorator(source);
        source = new EncryptionDecorator(source);
        // Encryption > Compression > FileDataSource
        source.writeData("100000");
    }
}
```



#### Facade

**Intent**

Facade is a structural design pattern that provides a simplified interface to a library, a framework, or any other complex set of classes.

**Problem**

To use a sophisticated video conversion framework, you'd need to initialize dozens of objects, keep track of dependencies, execute methods in the correct order, etc. Your business logic becomes tightly coupled to the implementation details of 3rd-party classes.

**Solution**

Create a **facade** class that provides a simple interface to the complex subsystem. It may provide limited functionality compared to working with the subsystem directly, but includes only the features clients really care about. For example, a `VideoConverter` class with a single `encode(filename, format)` method.

**Structure**

1. **Facade** â€” provides convenient access to a part of the subsystem's functionality; knows where to direct requests.
2. **Additional Facade** (optional) â€” prevents polluting a single facade with unrelated features.
3. **Complex Subsystem** â€” dozens of various objects; unaware of the facade's existence.
4. **Client** â€” uses the facade instead of calling subsystem objects directly.

**When to use**

- When you need a limited but straightforward interface to a complex subsystem.
- When you want to structure a subsystem into layers.

**Pros and Cons**

âœ… Isolate your code from the complexity of a subsystem.  
âŒ A facade can become a god object coupled to all classes of an app.

**Java Example**

```java
// Complex subsystem classes
class VideoFile { 
    private String name;
    public VideoFile(String name) { this.name = name; }
    public String getName() { return name; }
}

class CodecFactory {
    public String extract(VideoFile file) {
        return file.getName().endsWith(".ogg") ? "ogg" : "mpeg4";
    }
}

class BitrateReader {
    public static String read(String filename, String codec) {
        return "buffer[" + filename + ":" + codec + "]";
    }
    public static String convert(String buffer, String destinationCodec) {
        return "converted[" + buffer + "->" + destinationCodec + "]";
    }
}

class AudioMixer {
    public String fix(String result) { return "fixed[" + result + "]"; }
}

// Facade
class VideoConverter {
    public String convert(String filename, String format) {
        VideoFile file = new VideoFile(filename);
        String sourceCodec = new CodecFactory().extract(file);
        String destinationCodec = format.equals("mp4") ? "mpeg4" : "ogg";
        String buffer = BitrateReader.read(filename, sourceCodec);
        String result = BitrateReader.convert(buffer, destinationCodec);
        result = new AudioMixer().fix(result);
        return result;
    }
}

// Client â€” depends only on the facade
public class Demo {
    public static void main(String[] args) {
        VideoConverter converter = new VideoConverter();
        String result = converter.convert("funny-cats.ogg", "mp4");
        System.out.println("Converted: " + result);
    }
}
```



#### Flyweight

> Also known as: **Cache**

**Intent**

Flyweight is a structural design pattern that lets you fit more objects into the available amount of RAM by sharing common parts of state between multiple objects instead of keeping all of the data in each object.

**Problem**

In a video game, each particle (bullet, missile, shrapnel) is a separate object with fields like coordinates, vector, speed, color, and sprite. Color and sprite consume much more memory but are the same for all bullets. When thousands of particles exist simultaneously, the program runs out of RAM.

**Solution**

Stop storing the **extrinsic state** (color, sprite â€” constant, shared) inside the object. Extract it to a separate **flyweight** class. Pass the extrinsic state through method parameters when needed. The **intrinsic state** (coordinates, vector, speed â€” unique, changing) stays in a lightweight context object. A **Flyweight Factory** manages a pool of existing flyweights, returning existing ones or creating new ones as needed.

**Structure**

1. **Flyweight** â€” contains the intrinsic (shared) state; must be immutable.
2. **Context** â€” contains the extrinsic (unique) state; paired with a flyweight it represents the full original object.
3. **Flyweight Factory** â€” manages the pool of flyweights.
4. **Client** â€” calculates/stores the extrinsic state of flyweights.

**When to use**

- When your program must support a huge number of objects which barely fit into available RAM.
- When objects contain duplicate states that can be extracted and shared.

**Pros and Cons**

âœ… Save lots of RAM when you have tons of similar objects.  
âŒ May trade RAM over CPU cycles.  
âŒ Code becomes more complicated.

**Java Example**

```java
import java.util.HashMap;
import java.util.Map;

// Flyweight â€” intrinsic (shared) state
final class TreeType {
    private final String name;
    private final String color;
    private final String texture;

    public TreeType(String name, String color, String texture) {
        this.name = name; this.color = color; this.texture = texture;
    }

    public void draw(int x, int y) {
        System.out.println("Drawing " + name + " [" + color + "] at (" + x + "," + y + ")");
    }
}

// Flyweight Factory
class TreeFactory {
    private static final Map<String, TreeType> treeTypes = new HashMap<>();

    public static TreeType getTreeType(String name, String color, String texture) {
        String key = name + "_" + color + "_" + texture;
        return treeTypes.computeIfAbsent(key, k -> new TreeType(name, color, texture));
    }
}

// Context â€” extrinsic (unique) state
class Tree {
    private int x, y;
    private TreeType type; // reference to flyweight

    public Tree(int x, int y, TreeType type) {
        this.x = x; this.y = y; this.type = type;
    }

    public void draw() { type.draw(x, y); }
}

// Client
public class Demo {
    public static void main(String[] args) {
        // All oak trees share the same TreeType flyweight
        TreeType oak = TreeFactory.getTreeType("Oak", "green", "rough");
        Tree t1 = new Tree(1, 2, oak);
        Tree t2 = new Tree(5, 7, oak);
        Tree t3 = new Tree(3, 9, oak);
        t1.draw(); t2.draw(); t3.draw();
        System.out.println("Unique tree types created: " + 1); // only 1 flyweight
    }
}
```



#### Proxy

**Intent**

Proxy is a structural design pattern that lets you provide a substitute or placeholder for another object. A proxy controls access to the original object, allowing you to perform something either before or after the request gets through to the original object.

**Problem**

You have a massive object that consumes vast system resources. You need it from time to time, but not always. Implementing lazy initialization for it in every client that uses the object would cause a lot of code duplication â€” and the object's class may be from a closed 3rd-party library.

**Solution**

Create a new proxy class with the same interface as the original service object. The proxy creates the real service object only when actually needed, delegates all work to it, and can perform additional work before/after the delegation (lazy init, caching, logging, access control, etc.).

**Types of proxies:** virtual (lazy init), protective (access control), remote, logging, caching, smart reference.

**Structure**

1. **Service Interface** â€” declares the interface; proxy must follow it.
2. **Service** â€” provides the useful business logic.
3. **Proxy** â€” has a reference to the service; handles lifecycle, performs pre/post processing, delegates to service.
4. **Client** â€” works with both service and proxy via the same interface.

**When to use**

- Lazy initialization (virtual proxy).
- Access control (protection proxy).
- Local execution of a remote service (remote proxy).
- Logging, caching, smart reference.

**Pros and Cons**

âœ… Control the service object without clients knowing.  
âœ… Manage lifecycle of the service object.  
âœ… Works even if the service isn't ready.  
âœ… Open/Closed Principle.  
âŒ Code may become more complicated.  
âŒ Response may be delayed.

**Java Example**

```java
import java.util.HashMap;
import java.util.Map;

// Service Interface
interface ThirdPartyYouTubeLib {
    String[] listVideos();
    String getVideoInfo(String id);
    void downloadVideo(String id);
}

// Real Service
class ThirdPartyYouTubeClass implements ThirdPartyYouTubeLib {
    public String[] listVideos() {
        System.out.println("[YouTube API] Fetching video list...");
        return new String[]{"video1", "video2", "video3"};
    }
    public String getVideoInfo(String id) {
        System.out.println("[YouTube API] Fetching info for " + id);
        return "Info for " + id;
    }
    public void downloadVideo(String id) {
        System.out.println("[YouTube API] Downloading " + id);
    }
}

// Proxy with caching
class CachedYouTubeClass implements ThirdPartyYouTubeLib {
    private ThirdPartyYouTubeLib service;
    private String[] listCache;
    private Map<String, String> videoCache = new HashMap<>();

    public CachedYouTubeClass(ThirdPartyYouTubeLib service) {
        this.service = service;
    }

    public String[] listVideos() {
        if (listCache == null) listCache = service.listVideos();
        else System.out.println("[Cache HIT] video list");
        return listCache;
    }

    public String getVideoInfo(String id) {
        return videoCache.computeIfAbsent(id, k -> service.getVideoInfo(k));
    }

    public void downloadVideo(String id) {
        service.downloadVideo(id);
    }
}

public class Demo {
    public static void main(String[] args) {
        ThirdPartyYouTubeLib youtube = new CachedYouTubeClass(new ThirdPartyYouTubeClass());
        youtube.listVideos();   // real call
        youtube.listVideos();   // from cache
        youtube.getVideoInfo("video1"); // real call
        youtube.getVideoInfo("video1"); // from cache
    }
}
```



### Behavioral patterns

These patterns are concerned with algorithms and the assignment of responsibilities between objects.



#### Chain of Responsibility

> Also known as: **CoR, Chain of Command**

**Intent**

Chain of Responsibility is a behavioral design pattern that lets you pass requests along a chain of handlers. Upon receiving a request, each handler decides either to process the request or to pass it to the next handler in the chain.

**Problem**

An online ordering system needs sequential checks: authentication, data validation, caching, and authorization. Adding each new check increases coupling and makes the code messier. Reusing some checks in other parts of the system leads to code duplication.

**Solution**

Extract each check into its own class with a single method. Link these handlers into a chain. Each handler stores a reference to the next handler and either processes the request or passes it along. A handler can also decide to stop any further processing.

**Structure**

1. **Handler interface** â€” declares a single method for handling requests.
2. **Base Handler** â€” optional boilerplate class with a field for the next handler; implements default pass-through behavior.
3. **Concrete Handlers** â€” contain actual code for processing; each decides whether to process or pass.
4. **Client** â€” composes chains and triggers handlers.

**When to use**

- When the program is expected to process different kinds of requests in various ways, and the sequences are unknown beforehand.
- When it's essential to execute several handlers in a particular order.
- When the set of handlers and their order should change at runtime.

**Pros and Cons**

âœ… Control the order of request handling.  
âœ… Single Responsibility + Open/Closed Principles.  
âŒ Some requests may end up unhandled.

**Java Example**

```java
// Handler interface
abstract class Handler {
    private Handler next;

    public Handler setNext(Handler next) {
        this.next = next;
        return next;
    }

    public String handle(int request) {
        if (next != null) return next.handle(request);
        return null;
    }
}

// Concrete Handlers
class MonkeyHandler extends Handler {
    @Override
    public String handle(int request) {
        if (request < 3) return "Monkey handled " + request;
        return super.handle(request);
    }
}

class DogHandler extends Handler {
    @Override
    public String handle(int request) {
        if (request < 7) return "Dog handled " + request;
        return super.handle(request);
    }
}

class CatHandler extends Handler {
    @Override
    public String handle(int request) {
        if (request < 10) return "Cat handled " + request;
        return super.handle(request);
    }
}

public class Demo {
    public static void main(String[] args) {
        Handler monkey = new MonkeyHandler();
        Handler dog = new DogHandler();
        Handler cat = new CatHandler();

        monkey.setNext(dog).setNext(cat);

        for (int food : new int[]{2, 5, 8, 15}) {
            String result = monkey.handle(food);
            System.out.println("Request " + food + ": " + (result != null ? result : "left unhandled"));
        }
    }
}
```



#### Command

> Also known as: **Action, Transaction**

**Intent**

Command is a behavioral design pattern that turns a request into a stand-alone object that contains all information about the request. This transformation lets you pass requests as method arguments, delay or queue a request's execution, and support undoable operations.

**Problem**

Creating a toolbar with buttons for various operations leads to dozens of button subclasses. Operations like copy/paste need to be invoked from multiple places (toolbar, context menu, keyboard shortcuts), leading to duplication. GUI code becomes tightly coupled to volatile business logic.

**Solution**

Extract all request details (the object being called, method name, arguments) into a separate **command class** with a single execution method. Command objects serve as links between GUI and business logic. The GUI object triggers the command; the command handles all details. Commands can be stored in history and undone.

**Structure**

1. **Invoker (Sender)** â€” triggers commands; holds a reference to a command object.
2. **Command interface** â€” declares a single execution method.
3. **Concrete Commands** â€” implement requests; delegate work to business logic objects (receivers).
4. **Receiver** â€” contains business logic; knows how to perform the actual work.
5. **Client** â€” creates and configures concrete command objects.

**When to use**

- When you want to parameterize objects with operations.
- When you want to queue operations, schedule their execution, or execute them remotely.
- When you want to implement reversible operations.

**Pros and Cons**

âœ… Single Responsibility + Open/Closed Principles.  
âœ… Implement undo/redo.  
âœ… Implement deferred execution.  
âœ… Assemble simple commands into complex ones.  
âŒ Code becomes more complicated with a new layer between senders and receivers.

**Java Example**

```java
import java.util.ArrayDeque;
import java.util.Deque;

// Receiver
class TextEditor {
    private StringBuilder text = new StringBuilder();
    private String clipboard = "";

    public void write(String s) { text.append(s); }
    public String getText() { return text.toString(); }
    public void deleteLastWord() {
        if (text.length() > 0) text.delete(text.lastIndexOf(" ") + 1, text.length());
    }
    public void copyLastWord() {
        int idx = text.lastIndexOf(" ");
        clipboard = text.substring(idx + 1);
    }
    public void paste() { text.append(clipboard); }
}

// Command interface
interface Command {
    void execute();
    void undo();
}

// Concrete Command â€” Write
class WriteCommand implements Command {
    private TextEditor editor;
    private String text;
    public WriteCommand(TextEditor editor, String text) { this.editor = editor; this.text = text; }
    public void execute() { editor.write(text); }
    public void undo() { for (int i = 0; i < text.length(); i++) editor.deleteLastWord(); }
}

// Invoker
class CommandManager {
    private Deque<Command> history = new ArrayDeque<>();

    public void executeCommand(Command cmd) {
        cmd.execute();
        history.push(cmd);
    }

    public void undo() {
        if (!history.isEmpty()) history.pop().undo();
    }
}

public class Demo {
    public static void main(String[] args) {
        TextEditor editor = new TextEditor();
        CommandManager manager = new CommandManager();

        manager.executeCommand(new WriteCommand(editor, "Hello "));
        manager.executeCommand(new WriteCommand(editor, "World"));
        System.out.println("After writes: " + editor.getText());

        manager.undo();
        System.out.println("After undo: " + editor.getText());
    }
}
```



#### Iterator

**Intent**

Iterator is a behavioral design pattern that lets you traverse elements of a collection without exposing its underlying representation (list, stack, tree, etc.).

**Problem**

Collections can be lists, stacks, trees, graphs, etc. You need to traverse them all in a uniform way, but different traversal algorithms (depth-first, breadth-first, random) shouldn't bloat the collection classes.

**Solution**

Extract the traversal behavior into a separate **iterator** object. The iterator encapsulates traversal details (current position, how many elements are left). Multiple iterators can traverse the same collection simultaneously and independently. All iterators implement the same interface, making client code compatible with any collection type.

**Structure**

1. **Iterator interface** â€” declares operations for traversing a collection (getNext, hasMore, etc.).
2. **Concrete Iterators** â€” implement specific traversal algorithms; track traversal progress.
3. **Collection interface** â€” declares one or more methods for getting compatible iterators.
4. **Concrete Collections** â€” return new iterator instances when requested.
5. **Client** â€” works with collections and iterators via their interfaces.

**When to use**

- When a collection has a complex data structure and you want to hide its complexity.
- To reduce duplication of traversal code across your app.
- When you want to traverse different data structures uniformly.

**Pros and Cons**

âœ… Single Responsibility + Open/Closed Principles.  
âœ… Parallel iteration over the same collection.  
âœ… Delay iteration and continue when needed.  
âŒ Overkill for simple collections.

**Java Example**

```java
import java.util.Iterator;
import java.util.NoSuchElementException;

// A custom range collection
class NumberRange implements Iterable<Integer> {
    private int from;
    private int to;

    public NumberRange(int from, int to) { this.from = from; this.to = to; }

    @Override
    public Iterator<Integer> iterator() {
        return new Iterator<Integer>() {
            private int current = from;

            public boolean hasNext() { return current <= to; }
            public Integer next() {
                if (!hasNext()) throw new NoSuchElementException();
                return current++;
            }
        };
    }
}

public class Demo {
    public static void main(String[] args) {
        NumberRange range = new NumberRange(1, 5);
        for (int n : range) {
            System.out.print(n + " "); // 1 2 3 4 5
        }
        System.out.println();

        // Two iterators on the same collection, independent
        Iterator<Integer> it1 = range.iterator();
        Iterator<Integer> it2 = range.iterator();
        System.out.println("it1 next: " + it1.next()); // 1
        System.out.println("it2 next: " + it2.next()); // 1 â€” independent
        System.out.println("it1 next: " + it1.next()); // 2
    }
}
```



#### Mediator

> Also known as: **Intermediary, Controller**

**Intent**

Mediator is a behavioral design pattern that lets you reduce chaotic dependencies between objects. The pattern restricts direct communications between the objects and forces them to collaborate only via a mediator object.

**Problem**

A dialog with various form controls (text fields, checkboxes, buttons) that interact with each other creates a tightly coupled mesh of dependencies. Each form element knows about many others, making them impossible to reuse in other forms.

**Solution**

The components cease all direct communication and instead collaborate by calling a special **mediator** object that redirects calls to the appropriate components. The mediator acts as the central hub for all cross-component communication, while each component only knows about the mediator.

**Structure**

1. **Components** â€” classes with business logic; each has a reference to the mediator interface.
2. **Mediator interface** â€” declares communication methods (usually a single `notify` method).
3. **Concrete Mediators** â€” encapsulate relations between components; often hold references to all components.

**When to use**

- When it's hard to change some classes because they are tightly coupled to many others.
- When you can't reuse a component in a different program because it's too dependent on other components.
- When you create tons of component subclasses just to reuse basic behavior in various contexts.

**Pros and Cons**

âœ… Single Responsibility + Open/Closed Principles.  
âœ… Reduce coupling between components.  
âœ… Reuse individual components more easily.  
âŒ Over time a mediator can evolve into a God Object.

**Java Example**

```java
import java.util.ArrayList;
import java.util.List;

// Mediator interface
interface Mediator {
    void notify(Component sender, String event);
}

// Base Component
abstract class Component {
    protected Mediator mediator;
    public Component(Mediator mediator) { this.mediator = mediator; }
}

// Concrete Components
class Button extends Component {
    public Button(Mediator mediator) { super(mediator); }
    public void click() { mediator.notify(this, "click"); }
}

class Checkbox extends Component {
    public boolean checked = false;
    public Checkbox(Mediator mediator) { super(mediator); }
    public void check() {
        checked = !checked;
        mediator.notify(this, "check");
    }
}

class TextBox extends Component {
    public boolean visible = true;
    public TextBox(Mediator mediator) { super(mediator); }
}

// Concrete Mediator
class AuthDialog implements Mediator {
    private Button loginBtn;
    private Checkbox rememberMe;
    private TextBox emailField;

    public AuthDialog() {
        loginBtn = new Button(this);
        rememberMe = new Checkbox(this);
        emailField = new TextBox(this);
    }

    public void notify(Component sender, String event) {
        if (sender == loginBtn && event.equals("click")) {
            System.out.println("AuthDialog: validating credentials...");
        }
        if (sender == rememberMe && event.equals("check")) {
            System.out.println("AuthDialog: remember me " + (rememberMe.checked ? "enabled" : "disabled"));
        }
    }

    public Button getLoginBtn() { return loginBtn; }
    public Checkbox getRememberMe() { return rememberMe; }
}

public class Demo {
    public static void main(String[] args) {
        AuthDialog dialog = new AuthDialog();
        dialog.getRememberMe().check(); // triggers mediator
        dialog.getLoginBtn().click();   // triggers mediator
    }
}
```



#### Memento

> Also known as: **Snapshot**

**Intent**

Memento is a behavioral design pattern that lets you save and restore the previous state of an object without revealing the details of its implementation.

**Problem**

To implement undo in a text editor, you need to save the editor's state before every operation. If you try to copy all fields from outside the editor, you'll run into private fields. If you make them public, other code can become dependent on every internal detail of the editor.

**Solution**

The Memento pattern delegates creating the state snapshot to the actual owner â€” the **originator**. The snapshot is stored in a special **memento** object. Other objects can only read its metadata (creation time, operation name), not the actual state. A **caretaker** stores mementos in a history stack and retrieves them for undo.

**Structure**

1. **Originator** â€” can produce snapshots of its own state and restore from them.
2. **Memento** â€” immutable value object acting as a snapshot; only the originator can access its full state.
3. **Caretaker** â€” knows when/why to capture state; stores a stack of mementos.

**When to use**

- When you want to produce snapshots of an object's state to restore a previous state (undo).
- When direct access to an object's fields would violate its encapsulation.

**Pros and Cons**

âœ… Produce snapshots without violating encapsulation.  
âœ… Simplify the originator's code by letting the caretaker maintain history.  
âŒ App may consume lots of RAM if mementos are created too often.

**Java Example**

```java
import java.util.ArrayDeque;
import java.util.Deque;

// Originator
class Editor {
    private String text;
    private int cursorX, cursorY;

    public void setText(String text) { this.text = text; }
    public void setCursor(int x, int y) { this.cursorX = x; this.cursorY = y; }
    public String getText() { return text; }

    // Creates a memento (snapshot)
    public Snapshot createSnapshot() {
        return new Snapshot(this, text, cursorX, cursorY);
    }

    // Memento (nested class has access to private fields)
    public static class Snapshot {
        private final Editor editor;
        private final String text;
        private final int cursorX, cursorY;

        private Snapshot(Editor editor, String text, int cursorX, int cursorY) {
            this.editor = editor;
            this.text = text; this.cursorX = cursorX; this.cursorY = cursorY;
        }

        public void restore() {
            editor.text = text;
            editor.cursorX = cursorX;
            editor.cursorY = cursorY;
        }
    }
}

// Caretaker
class History {
    private final Deque<Editor.Snapshot> history = new ArrayDeque<>();

    public void backup(Editor editor) {
        history.push(editor.createSnapshot());
    }

    public void undo() {
        if (!history.isEmpty()) history.pop().restore();
    }
}

public class Demo {
    public static void main(String[] args) {
        Editor editor = new Editor();
        History history = new History();

        editor.setText("Hello");
        history.backup(editor);

        editor.setText("Hello World");
        System.out.println("Current: " + editor.getText()); // Hello World

        history.undo();
        System.out.println("After undo: " + editor.getText()); // Hello
    }
}
```



#### Observer

> Also known as: **Event-Subscriber, Listener**

**Intent**

Observer is a behavioral design pattern that lets you define a subscription mechanism to notify multiple objects about any events that happen to the object they're observing.

**Problem**

A `Customer` is interested in a product available soon at a `Store`. The customer could check daily (wasteful), or the store could email all customers when any product arrives (spammy). Neither is ideal.

**Solution**

Add a **subscription mechanism** to the publisher class so individual objects can subscribe to or unsubscribe from a stream of events. The mechanism consists of an array field storing subscriber references and public methods to add/remove subscribers. When an important event occurs, the publisher iterates over subscribers and calls the notification method on each. All subscribers must implement the same interface.

**Structure**

1. **Publisher** â€” issues events; contains subscription infrastructure (add/remove/notify).
2. **Subscriber interface** â€” declares the notification method (`update`).
3. **Concrete Subscribers** â€” perform actions in response to notifications.
4. **Client** â€” creates publisher and subscriber objects and registers subscribers.

**When to use**

- When changes to the state of one object may require changing other objects, and the actual set of objects is unknown or changes dynamically.
- When some objects must observe others, but only for a limited time or in specific cases.

**Pros and Cons**

âœ… Open/Closed Principle â€” introduce new subscriber classes without changing the publisher.  
âœ… Establish relations between objects at runtime.  
âŒ Subscribers are notified in random order.

**Java Example**

```java
import java.util.*;

// Subscriber interface
interface EventListener {
    void update(String eventType, String data);
}

// Publisher with subscription management
class EventManager {
    private Map<String, List<EventListener>> listeners = new HashMap<>();

    public void subscribe(String eventType, EventListener listener) {
        listeners.computeIfAbsent(eventType, k -> new ArrayList<>()).add(listener);
    }

    public void unsubscribe(String eventType, EventListener listener) {
        List<EventListener> users = listeners.get(eventType);
        if (users != null) users.remove(listener);
    }

    public void notify(String eventType, String data) {
        List<EventListener> users = listeners.getOrDefault(eventType, Collections.emptyList());
        for (EventListener listener : users) listener.update(eventType, data);
    }
}

// Concrete Publisher (Originator)
class Editor {
    public EventManager events = new EventManager();
    private String filename;

    public void openFile(String path) {
        this.filename = path;
        events.notify("open", filename);
    }

    public void saveFile() {
        events.notify("save", filename);
    }
}

// Concrete Subscribers
class LoggingListener implements EventListener {
    public void update(String eventType, String data) {
        System.out.println("[LOG] Event '" + eventType + "' for file: " + data);
    }
}

class EmailAlertsListener implements EventListener {
    private String email;
    public EmailAlertsListener(String email) { this.email = email; }
    public void update(String eventType, String data) {
        System.out.println("[EMAIL to " + email + "] File " + data + " was " + eventType + "d");
    }
}

public class Demo {
    public static void main(String[] args) {
        Editor editor = new Editor();
        editor.events.subscribe("open", new LoggingListener());
        editor.events.subscribe("save", new EmailAlertsListener("admin@example.com"));

        editor.openFile("report.txt");  // triggers LoggingListener
        editor.saveFile();              // triggers EmailAlertsListener
    }
}
```



#### State

**Intent**

State is a behavioral design pattern that lets an object alter its behavior when its internal state changes. It appears as if the object changed its class.

**Problem**

A `Document` class has a `publish()` method that behaves differently depending on the current state (`Draft`, `Moderation`, `Published`). Implementing this with conditionals (`switch`/`if`) creates maintenance nightmares: any change to transition logic requires modifying every method. The more states, the worse it gets.

**Solution**

Create new classes for all possible states and extract all state-specific behaviors into these classes. The original object (**context**) stores a reference to one of the state objects and delegates all state-related work to that object. To transition, replace the active state object with another.

**Structure**

1. **Context** â€” stores a reference to a concrete state object; delegates state-specific work to it; exposes a setter for changing state.
2. **State interface** â€” declares state-specific methods that make sense for all states.
3. **Concrete States** â€” provide their own implementations; may hold a back-reference to the context to trigger transitions.

**When to use**

- When an object behaves differently depending on its current state, the number of states is large, and state-specific code changes frequently.
- When you have a class polluted with massive conditionals.
- When you have lots of duplicate code across similar states.

**Pros and Cons**

âœ… Single Responsibility + Open/Closed Principles.  
âœ… Eliminate bulky state machine conditionals.  
âŒ Overkill if a state machine has only a few states or rarely changes.

**Java Example**

```java
// State interface
interface State {
    void clickLock(AudioPlayer player);
    void clickPlay(AudioPlayer player);
    void clickNext(AudioPlayer player);
}

// Context
class AudioPlayer {
    private State state;
    private boolean playing = false;

    public AudioPlayer() { this.state = new ReadyState(); }

    public void setState(State state) { this.state = state; }
    public boolean isPlaying() { return playing; }
    public void setPlaying(boolean playing) { this.playing = playing; }

    public void clickLock() { state.clickLock(this); }
    public void clickPlay() { state.clickPlay(this); }
    public void clickNext() { state.clickNext(this); }
}

// Concrete States
class LockedState implements State {
    public void clickLock(AudioPlayer p) {
        if (p.isPlaying()) p.setState(new PlayingState());
        else p.setState(new ReadyState());
        System.out.println("Unlocked");
    }
    public void clickPlay(AudioPlayer p) { System.out.println("Locked â€” cannot play"); }
    public void clickNext(AudioPlayer p) { System.out.println("Locked â€” cannot skip"); }
}

class ReadyState implements State {
    public void clickLock(AudioPlayer p) { p.setState(new LockedState()); System.out.println("Locked"); }
    public void clickPlay(AudioPlayer p) {
        p.setPlaying(true);
        p.setState(new PlayingState());
        System.out.println("Started playback");
    }
    public void clickNext(AudioPlayer p) { System.out.println("Next song"); }
}

class PlayingState implements State {
    public void clickLock(AudioPlayer p) { p.setState(new LockedState()); System.out.println("Locked"); }
    public void clickPlay(AudioPlayer p) {
        p.setPlaying(false);
        p.setState(new ReadyState());
        System.out.println("Stopped playback");
    }
    public void clickNext(AudioPlayer p) { System.out.println("Fast forward 5s"); }
}

public class Demo {
    public static void main(String[] args) {
        AudioPlayer player = new AudioPlayer();
        player.clickPlay();   // Started playback
        player.clickNext();   // Fast forward 5s
        player.clickLock();   // Locked
        player.clickPlay();   // Locked â€” cannot play
        player.clickLock();   // Unlocked (back to PlayingState)
    }
}
```



#### Strategy

**Intent**

Strategy is a behavioral design pattern that lets you define a family of algorithms, put each of them into a separate class, and make their objects interchangeable.

**Problem**

A navigation app starts with road routes, then adds walking routes, public transport, cycling â€” each a new algorithm added to the main navigator class. The class grows unmanageable, bug fixes affect everything, and teamwork causes merge conflicts.

**Solution**

Extract all routing algorithms into separate **strategy** classes. The original **context** class stores a reference to one of the strategy objects and delegates the work to it. The client can replace the current strategy object with another at runtime, making the context independent of concrete strategies.

**Structure**

1. **Context** â€” maintains a reference to a concrete strategy; communicates with it via the strategy interface; exposes a setter.
2. **Strategy interface** â€” declares the method used to execute a strategy.
3. **Concrete Strategies** â€” implement different variations of the algorithm.
4. **Client** â€” creates a specific strategy object and passes it to the context.

**When to use**

- When you want to use different variants of an algorithm and be able to switch between them at runtime.
- When you have a lot of similar classes that only differ in their behavior.
- When a class has a massive conditional switching between different algorithm variants.

**Pros and Cons**

âœ… Swap algorithms at runtime.  
âœ… Isolate implementation details from the code that uses them.  
âœ… Replace inheritance with composition.  
âœ… Open/Closed Principle.  
âŒ Overkill if you only have a couple of algorithms that rarely change.  
âŒ Clients must know the differences between strategies to select a proper one.

**Java Example**

```java
// Strategy interface
interface SortStrategy {
    void sort(int[] dataset);
}

// Concrete Strategies
class BubbleSortStrategy implements SortStrategy {
    public void sort(int[] dataset) {
        System.out.println("BubbleSort applied");
        // bubble sort implementation omitted for brevity
    }
}

class QuickSortStrategy implements SortStrategy {
    public void sort(int[] dataset) {
        System.out.println("QuickSort applied");
        // quicksort implementation omitted for brevity
    }
}

// Context
class Sorter {
    private SortStrategy strategy;

    public Sorter(SortStrategy strategy) { this.strategy = strategy; }

    public void setStrategy(SortStrategy strategy) { this.strategy = strategy; }

    public void sort(int[] dataset) { strategy.sort(dataset); }
}

public class Demo {
    public static void main(String[] args) {
        int[] data = {5, 3, 1, 4, 2};

        Sorter sorter = new Sorter(new BubbleSortStrategy());
        sorter.sort(data); // BubbleSort applied

        sorter.setStrategy(new QuickSortStrategy());
        sorter.sort(data); // QuickSort applied
    }
}
```



#### Template Method

**Intent**

Template Method is a behavioral design pattern that defines the skeleton of an algorithm in the superclass but lets subclasses override specific steps of the algorithm without changing its structure.

**Problem**

A data mining app reads DOC, CSV, and PDF files. All three classes have a lot of similar code for data processing and analysis, but the code for parsing different file formats is entirely different. There's a lot of duplication that is hard to eliminate.

**Solution**

Break the algorithm into a series of steps, turn these steps into methods, and call them inside a single **template method** (usually declared `final`). Some steps are `abstract` and must be implemented by subclasses. Others may have default implementations (optional overrides). **Hooks** are optional steps with empty bodies that can optionally be overridden.

**Structure**

1. **Abstract Class** â€” declares the template method (calling steps in order) and declares abstract step methods.
2. **Concrete Classes** â€” implement all abstract steps; may also override optional steps.

**When to use**

- When you want to let clients extend only particular steps of an algorithm.
- When you have several classes containing almost identical algorithms with minor differences.

**Pros and Cons**

âœ… Pull duplicate code into a superclass.  
âœ… Clients override only certain parts.  
âŒ May violate the Liskov Substitution Principle by suppressing a default step.  
âŒ Harder to maintain as more steps are added.

**Java Example**

```java
// Abstract Class with template method
abstract class DataMiner {

    // Template method â€” defines the skeleton
    public final void mine(String path) {
        String rawData = extractData(path);
        String parsedData = parseData(rawData);
        analyzeData(parsedData);
        sendReport(parsedData);
    }

    protected abstract String extractData(String path);
    protected abstract String parseData(String rawData);

    // Default implementation â€” can be overridden
    protected void analyzeData(String parsedData) {
        System.out.println("Analyzing: " + parsedData);
    }

    // Default implementation
    protected void sendReport(String data) {
        System.out.println("Sending report: " + data);
    }
}

// Concrete Class for CSV
class CSVDataMiner extends DataMiner {
    protected String extractData(String path) {
        return "[CSV raw data from " + path + "]";
    }
    protected String parseData(String rawData) {
        return "[CSV parsed: " + rawData + "]";
    }
}

// Concrete Class for PDF
class PDFDataMiner extends DataMiner {
    protected String extractData(String path) {
        return "[PDF raw data from " + path + "]";
    }
    protected String parseData(String rawData) {
        return "[PDF parsed: " + rawData + "]";
    }
    @Override
    protected void analyzeData(String parsedData) {
        System.out.println("PDF-specific analysis: " + parsedData);
    }
}

public class Demo {
    public static void main(String[] args) {
        DataMiner csvMiner = new CSVDataMiner();
        csvMiner.mine("report.csv");

        System.out.println("");

        DataMiner pdfMiner = new PDFDataMiner();
        pdfMiner.mine("report.pdf");
    }
}
```



#### Visitor

**Intent**

Visitor is a behavioral design pattern that lets you separate algorithms from the objects on which they operate.

**Problem**

A geographic graph app needs to export all nodes to XML. Adding an `export()` method to each node class is risky (production code) and mixes concerns. The next request for a different export format would force yet another round of changes to all node classes.

**Solution**

Place the new behavior into a separate **visitor** class instead of integrating it into existing classes. The original object is passed to one of the visitor's methods as an argument. The pattern uses **Double Dispatch**: instead of the client selecting which visitor method to call, the object itself "accepts" a visitor and redirects to the appropriate method. This way, adding a new export format just means adding a new visitor class, without touching any node.

**Structure**

1. **Visitor interface** â€” declares visiting methods for each concrete element class.
2. **Concrete Visitors** â€” implement behaviors for each concrete element.
3. **Element interface** â€” declares an `accept(visitor)` method.
4. **Concrete Elements** â€” implement `accept()` by calling the matching visiting method on the visitor.
5. **Client** â€” works with elements via the element interface; creates visitor objects and passes them.

**When to use**

- When you need to perform an operation on all elements of a complex object structure.
- When you want to clean up the business logic of auxiliary behaviors.
- When a behavior makes sense only in some classes of a hierarchy.

**Pros and Cons**

âœ… Open/Closed Principle â€” new behaviors without changing classes.  
âœ… Single Responsibility Principle.  
âœ… A visitor can accumulate useful information while traversing a structure.  
âŒ Need to update all visitors each time a class is added to the hierarchy.  
âŒ Visitors might lack access to private fields.

**Java Example**

```java
// Element interface
interface Shape {
    void move(int x, int y);
    void draw();
    String accept(ShapeVisitor visitor); // Double Dispatch entry point
}

// Visitor interface
interface ShapeVisitor {
    String visitDot(Dot dot);
    String visitCircle(Circle circle);
    String visitRectangle(Rectangle rectangle);
}

// Concrete Elements
class Dot implements Shape {
    public int x, y;
    public Dot(int x, int y) { this.x = x; this.y = y; }
    public void move(int x, int y) { this.x += x; this.y += y; }
    public void draw() { System.out.println("Dot at (" + x + "," + y + ")"); }
    public String accept(ShapeVisitor v) { return v.visitDot(this); }
}

class Circle implements Shape {
    public int x, y, radius;
    public Circle(int x, int y, int radius) { this.x = x; this.y = y; this.radius = radius; }
    public void move(int x, int y) { this.x += x; this.y += y; }
    public void draw() { System.out.println("Circle at (" + x + "," + y + ") r=" + radius); }
    public String accept(ShapeVisitor v) { return v.visitCircle(this); }
}

class Rectangle implements Shape {
    public int x, y, w, h;
    public Rectangle(int x, int y, int w, int h) { this.x = x; this.y = y; this.w = w; this.h = h; }
    public void move(int x, int y) { this.x += x; this.y += y; }
    public void draw() { System.out.println("Rectangle at (" + x + "," + y + ") " + w + "x" + h); }
    public String accept(ShapeVisitor v) { return v.visitRectangle(this); }
}

// Concrete Visitor: XML Export
class XMLExportVisitor implements ShapeVisitor {
    public String visitDot(Dot d) {
        return "<dot x='" + d.x + "' y='" + d.y + "'/>";
    }
    public String visitCircle(Circle c) {
        return "<circle x='" + c.x + "' y='" + c.y + "' r='" + c.radius + "'/>";
    }
    public String visitRectangle(Rectangle r) {
        return "<rect x='" + r.x + "' y='" + r.y + "' w='" + r.w + "' h='" + r.h + "'/>";
    }
}

public class Demo {
    public static void main(String[] args) {
        Shape[] shapes = { new Dot(1, 2), new Circle(5, 3, 10), new Rectangle(0, 0, 100, 50) };
        ShapeVisitor exporter = new XMLExportVisitor();

        for (Shape shape : shapes) {
            System.out.println(shape.accept(exporter));
        }
    }
}
```

